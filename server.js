"use strict";

/**
 * TFI — Razorpay backend
 *
 *   POST /api/razorpay/create-order   recompute price, create a Razorpay order
 *   POST /api/razorpay/verify         verify the checkout signature
 *   POST /api/razorpay/webhook        Razorpay -> server confirmation (source of truth)
 *
 * The browser only ever sends the selected options. The amount is calculated
 * here, so it can't be tampered with from the page.
 */

require("dotenv").config();

const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const Razorpay = require("razorpay");

const {
  RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET,
  RAZORPAY_WEBHOOK_SECRET,
  ALLOWED_ORIGIN,
  STATIC_DIR,
  PORT = 3000,
} = process.env;

if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
  console.error("Missing RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET in .env");
  process.exit(1);
}

const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

/* =========================================================
   PRICING — must mirror monthly-virtual-training.html
========================================================= */

const BASE = {
  specialized: { "12": 15000, "16": 20000, "20": 25000 },
  certified: { "12": 9999, "16": 13332, "20": 16665 },
};

const NUTRITION_PER_PERSON = 499;

const EXTENSION = {
  solo: { none: 0, "10": 999, "30": 2499 },
  couple: { none: 0, "10": 1499, "30": 3499 },
};

const LABELS = {
  session: { "12": "12 Sessions", "16": "16 Sessions", "20": "20 Sessions" },
  couple: { no: "Solo", yes: "Couple" },
  trainer: {
    certified: "Certified Personal Training",
    specialized: "Specialized Personal Training",
  },
  nutrition: { no: "Without Nutrition", yes: "With Nutrition" },
  extension: { none: "No Extension", "10": "10-Day Extension", "30": "30-Day Extension" },
};

function has(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

/** Returns { rupees, labels } or throws a 400-style error. */
function priceFor(sel) {
  const { session, couple, trainer, nutrition, extension } = sel || {};

  if (
    !has(LABELS.session, session) ||
    !has(LABELS.couple, couple) ||
    !has(LABELS.trainer, trainer) ||
    !has(LABELS.nutrition, nutrition) ||
    !has(LABELS.extension, extension)
  ) {
    const err = new Error("Invalid plan selection.");
    err.status = 400;
    throw err;
  }

  const isCouple = couple === "yes";

  let training = BASE[trainer][session];
  if (isCouple) training *= 1.5;

  const nutritionCost =
    nutrition === "yes" ? NUTRITION_PER_PERSON * (isCouple ? 2 : 1) : 0;

  const extensionCost = EXTENSION[isCouple ? "couple" : "solo"][extension];

  // Same as the page: sum first, round once.
  const rupees = Math.round(training + nutritionCost + extensionCost);

  return {
    rupees,
    labels: {
      session: LABELS.session[session],
      couple: LABELS.couple[couple],
      trainer: LABELS.trainer[trainer],
      nutrition: LABELS.nutrition[nutrition],
      extension: LABELS.extension[extension],
    },
  };
}

/* =========================================================
   ORDER LOG (replace with your database)
========================================================= */

const LOG_FILE = path.join(__dirname, "paid-orders.jsonl");

function recordPaid(entry) {
  fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + "\n");
  // TODO: email/WhatsApp your team + the customer here.
}

/* =========================================================
   APP
========================================================= */

const app = express();

// CORS only if the site is served from a different origin.
if (ALLOWED_ORIGIN) {
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });
}

/* ---------- Webhook (needs the RAW body, so it goes before express.json) ---------- */

app.post(
  "/api/razorpay/webhook",
  express.raw({ type: "application/json" }),
  (req, res) => {
    if (!RAZORPAY_WEBHOOK_SECRET) return res.sendStatus(503);

    const signature = req.get("X-Razorpay-Signature") || "";
    const expected = crypto
      .createHmac("sha256", RAZORPAY_WEBHOOK_SECRET)
      .update(req.body)
      .digest("hex");

    if (!safeEqual(expected, signature)) return res.sendStatus(400);

    const event = JSON.parse(req.body.toString("utf8"));

    if (event.event === "order.paid" || event.event === "payment.captured") {
      const payment = event.payload.payment && event.payload.payment.entity;
      if (payment) {
        recordPaid({
          source: "webhook",
          order_id: payment.order_id,
          payment_id: payment.id,
          amount: payment.amount,
          currency: payment.currency,
          email: payment.email,
          contact: payment.contact,
          notes: payment.notes,
          at: new Date().toISOString(),
        });
      }
    }

    res.sendStatus(200);
  }
);

app.use(express.json({ limit: "10kb" }));

/* ---------- Create order ---------- */

app.post("/api/razorpay/create-order", async (req, res) => {
  try {
    const { rupees, labels } = priceFor(req.body);

    const order = await razorpay.orders.create({
      amount: rupees * 100, // paise
      currency: "INR",
      receipt: "tfi_" + Date.now(),
      notes: {
        plan: "Monthly Virtual Training",
        ...labels,
      },
    });

    res.json({
      key_id: RAZORPAY_KEY_ID,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      description: `Monthly Virtual Training — ${labels.session}, ${labels.couple}`,
    });
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ error: err.message });
    console.error("create-order failed:", err);
    res.status(500).json({ error: "Could not start the payment. Please try again." });
  }
});

/* ---------- Verify payment ---------- */

app.post("/api/razorpay/verify", async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};

  if (
    typeof razorpay_order_id !== "string" ||
    typeof razorpay_payment_id !== "string" ||
    typeof razorpay_signature !== "string"
  ) {
    return res.status(400).json({ error: "Invalid request." });
  }

  const expected = crypto
    .createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(razorpay_order_id + "|" + razorpay_payment_id)
    .digest("hex");

  if (!safeEqual(expected, razorpay_signature)) {
    return res.status(400).json({ error: "Payment verification failed." });
  }

  try {
    const order = await razorpay.orders.fetch(razorpay_order_id);

    recordPaid({
      source: "verify",
      order_id: razorpay_order_id,
      payment_id: razorpay_payment_id,
      amount: order.amount,
      currency: order.currency,
      notes: order.notes,
      at: new Date().toISOString(),
    });
  } catch (err) {
    // Signature was valid, so the payment is real; the webhook will also record it.
    console.error("order fetch after verify failed:", err);
  }

  res.json({ ok: true });
});

function safeEqual(a, b) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

/* ---------- Optional: serve the website from the same server ---------- */

if (STATIC_DIR) {
  app.use(express.static(path.resolve(STATIC_DIR)));
}

if (require.main === module) {
  app.listen(PORT, () => console.log(`TFI payments server on :${PORT}`));
}

module.exports = { app, priceFor };
