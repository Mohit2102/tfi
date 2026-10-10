/* =====================================================================
   TFI — Personal-training condition pages: plan builder + tabs
   Used by the 8 condition pages. The programme name is read from the
   page <title> (text before the "|").

   Plan type is always Virtual and trainer level is always Specialized,
   so the builder only asks for Training Sessions, Nutrition and Extension.
   Prices follow the Specialized monthly virtual pricing: edit BASE,
   NUTRITION and EXTENSION below.
   ===================================================================== */
(function () {
  "use strict";

  var form = document.getElementById("mvForm");
  if (!form) return;

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---- Pricing (Specialized Personal Training, Virtual, Solo, 1 month) ---- */
  var BASE = { "12": 15000, "16": 20000, "20": 25000 };
  var NUTRITION = 499;                                   /* per month */
  var EXTENSION = { "none": 0, "10": 999 };

  var GROUPS = ["session", "nutrition", "extension"];
  var WA_NUMBER = "918951077599";
  var PLAN_LABEL = "Virtual Training";
  var TRAINER_LABEL = "Specialized Personal Training";
  var cond = document.title.split("|")[0].trim();

  var totalEl = $("#mvTotal"), stickyEl = $("#mvStickyTotal");
  var submit = $("#mvSubmit"), errorEl = $("#mvError"), wa = $("#mvWhatsapp");
  var sum = { session: $("#sumSession"), nutrition: $("#sumNutrition"), extension: $("#sumExtension") };

  function checked(name) { return form.querySelector('input[name="' + name + '"]:checked'); }
  function val(name) { var el = checked(name); return el ? el.value : ""; }
  function label(name) { var el = checked(name); return el ? el.getAttribute("data-label") : ""; }
  function money(n) { return "₹" + Math.round(Number(n)).toLocaleString("en-IN"); }

  function total() {
    var session = val("session");
    if (!BASE[session]) return 0;
    return BASE[session] +
      (val("nutrition") === "yes" ? NUTRITION : 0) +
      (EXTENSION[val("extension") || "none"] || 0);
  }

  function whatsappLink() {
    var msg = "Hello TFI \uD83D\uDC4B\n\nI would like to enquire about " + cond + ".";
    msg += "\n\n\uD83C\uDFCB\uFE0F *My Selected Plan*\n\n" +
      "\u2022 Plan Type: " + PLAN_LABEL + "\n" +
      "\u2022 Trainer Level: " + TRAINER_LABEL + "\n" +
      "\u2022 Training Sessions: " + (label("session") || "Not selected") + "\n" +
      "\u2022 Nutrition: " + (label("nutrition") || "Not selected") + "\n" +
      "\u2022 Extension: " + (label("extension") || "Not selected");
    if (total() > 0) msg += "\n\n\uD83D\uDCB0 *Final Total: " + money(total()) + "*";
    msg += "\n\nPlease share the final plan details and pricing. Thank you!";
    return "https://wa.me/" + WA_NUMBER + "?text=" + encodeURIComponent(msg);
  }

  function update() {
    var done = 0;

    GROUPS.forEach(function (g) {
      var el = checked(g), out = sum[g];
      var group = form.querySelector('.mvp-group[data-group="' + g + '"]');
      if (el) {
        out.textContent = el.getAttribute("data-label");
        out.classList.remove("empty");
        if (group) group.classList.remove("invalid");
        done++;
      } else {
        out.textContent = "Not selected";
        out.classList.add("empty");
      }
    });

    /* progress stepper */
    var firstOpen = true;
    GROUPS.forEach(function (g) {
      var step = $('.mvp-prog-step[data-step="' + g + '"]');
      if (!step) return;
      var selected = !!checked(g);
      step.classList.toggle("done", selected);
      step.classList.toggle("current", !selected && firstOpen);
      if (!selected) firstOpen = false;
    });

    var t = total();
    totalEl.textContent = money(t);
    if (stickyEl) stickyEl.textContent = money(t);

    totalEl.classList.remove("pop");
    void totalEl.offsetWidth;
    totalEl.classList.add("pop");

    submit.classList.toggle("locked", done < GROUPS.length);
    if (done === GROUPS.length) errorEl.classList.remove("show");

    if (wa) wa.href = whatsappLink();
  }

  form.addEventListener("change", update);

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var missing = GROUPS.filter(function (g) { return !checked(g); });

    if (missing.length) {
      GROUPS.forEach(function (g) {
        var group = form.querySelector('.mvp-group[data-group="' + g + '"]');
        if (group) group.classList.toggle("invalid", missing.indexOf(g) !== -1);
      });
      errorEl.textContent = "Please complete every step to continue.";
      errorEl.classList.remove("show");
      void errorEl.offsetWidth;
      errorEl.classList.add("show");
      var first = form.querySelector('.mvp-group[data-group="' + missing[0] + '"]');
      if (first) first.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    var q = "?" + new URLSearchParams({
      program: cond,
      plan: "Virtual",
      trainer: "specialized",
      session: val("session"),
      sessions: val("session") + " sessions",
      couple: "no",
      nutrition: val("nutrition"),
      extension: val("extension"),
      duration: "1 month",
      total: Math.round(total()),
      price: money(total())
    }).toString();
    window.location.href = "index.html" + q + "#contact";
  });

  /* ---- Compact dropdown steps ------------------------------------ */
  var groups = $$(".mvp-group", form);

  groups.forEach(function (group, index) {
    var lab = $(".mvp-lab b", group);
    var title = lab ? lab.textContent.trim() : "Step " + (index + 1);
    var uid = "mvDD" + index;
    var opts = $(".mvp-opts", group);
    if (opts) opts.id = uid;

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "mvp-dd-btn";
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-controls", uid);
    btn.innerHTML =
      '<span class="mvp-dd-num">' + (index + 1) + '</span>' +
      '<span class="mvp-dd-title">' + title + '</span>' +
      '<span class="mvp-dd-req">REQUIRED</span>' +
      '<span class="mvp-dd-val">Select</span>' +
      '<span class="mvp-dd-chev"><i class="fa-solid fa-chevron-down"></i></span>';
    group.insertBefore(btn, $(".mvp-lab", group));
    btn.addEventListener("click", function () { toggle(group); });
  });

  function setOpen(group, open) {
    group.classList.toggle("is-open", open);
    var btn = $(".mvp-dd-btn", group);
    if (btn) btn.setAttribute("aria-expanded", String(open));
  }
  function openOnly(group) { groups.forEach(function (g) { setOpen(g, g === group); }); }
  function toggle(group) {
    if (group.classList.contains("is-open")) setOpen(group, false);
    else openOnly(group);
  }

  function refresh() {
    groups.forEach(function (group) {
      var c = $("input:checked", group), v = $(".mvp-dd-val", group);
      if (!v) return;
      if (c) { v.textContent = c.getAttribute("data-label"); group.classList.add("has-value"); }
      else { v.textContent = "Select"; group.classList.remove("has-value"); }
    });
  }

  function nextEmpty(from) {
    var i;
    for (i = from + 1; i < groups.length; i++) if (!$("input:checked", groups[i])) return groups[i];
    for (i = 0; i < groups.length; i++) if (!$("input:checked", groups[i])) return groups[i];
    return null;
  }

  form.addEventListener("change", function (event) {
    refresh();
    var group = event.target.closest ? event.target.closest(".mvp-group") : null;
    if (!group) return;
    var i = groups.indexOf(group);
    window.setTimeout(function () {
      var next = nextEmpty(i);
      if (next) openOnly(next); else setOpen(group, false);
    }, 260);
  });

  $$(".mvp-prog-step").forEach(function (button) {
    button.addEventListener("click", function () {
      var group = form.querySelector('.mvp-group[data-group="' + button.getAttribute("data-step") + '"]');
      if (group) {
        openOnly(group);
        group.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  });

  form.addEventListener("submit", function () {
    window.setTimeout(function () {
      var bad = $(".mvp-group.invalid", form);
      if (bad) openOnly(bad);
    }, 0);
  });

  form.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    groups.forEach(function (g) { setOpen(g, false); });
  });

  var resetBtn = $("#mvReset");
  if (resetBtn) {
    resetBtn.addEventListener("click", function () {
      form.reset();
      groups.forEach(function (g) { g.classList.remove("invalid"); });
      errorEl.classList.remove("show");
      form.dispatchEvent(new Event("change", { bubbles: true }));
      openOnly(groups[0]);
    });
  }

  /* ---- "How it works" strip follows progress ---------------------- */
  var flow = $("#mvFlow"), items = $$("#mvFlow .mvp-flow-item");
  function updateFlow() {
    if (!flow || !items.length) return;
    var done = GROUPS.filter(function (n) { return checked(n); }).length;
    var all = done === GROUPS.length;
    items.forEach(function (li, i) {
      li.classList.toggle("is-done", all ? i === 0 : false);
      li.classList.toggle("is-current", all ? i === 1 : i === 0);
    });
    flow.style.setProperty("--mvp-fill", (all ? 1 : done / GROUPS.length) + "");
    flow.classList.toggle("is-ready", all);
  }
  form.addEventListener("change", updateFlow);

  /* ---- Details tabs ------------------------------------------------ */
  var tabs = $$(".mvp-tab"), panels = $$(".mvp-tabpanel");
  tabs.forEach(function (t) {
    t.addEventListener("click", function () {
      tabs.forEach(function (x) { x.setAttribute("aria-selected", x === t ? "true" : "false"); });
      panels.forEach(function (p) { p.classList.toggle("active", p.id === "t-" + t.dataset.tab); });
    });
  });

  /* ---- Start -------------------------------------------------------- */
  refresh();
  update();
  updateFlow();
  openOnly(groups[0]);
})();
