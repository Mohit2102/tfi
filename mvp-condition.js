/* =====================================================================
   TFI — Personal-training condition pages: plan builder + tabs
   Used by the 8 condition pages. The programme name is read from the
   page <title> (text before the "|").

   12-week virtual plan. Steps: Training Sessions, Training Type, Trainer
   Level, Nutrition Plan, Extension.
   Prices follow the 12-week virtual page: edit CFG below. If you change
   the extension or couple price, update the FAQ text on the pages too.
   ===================================================================== */
(function () {
  "use strict";

  var form = document.getElementById("mvForm");
  if (!form) return;

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---- 12-week pricing (same as the 12-week virtual page) ---- */
  var CFG = {
    base: { "3": 7999, "4": 9999, "5": 11999 },
    defaultBase: 7999,
    trainer: { standard: 0, advanced: 1500 },   /* standard = Specialized, advanced = Certified */
    couple: 3000,
    nutrition: 2500,
    ext: 1000,
    extValue: "1",
    months: 3
  };

  var GROUPS = ["session", "couple", "trainer", "nutrition", "extension"];
  var WA_NUMBER = "918951077599";
  var cond = document.title.split("|")[0].trim();

  var totalEl = $("#mvTotal"), stickyEl = $("#mvStickyTotal"), perMonthEl = $("#mvPerMonth");
  var submit = $("#mvSubmit"), errorEl = $("#mvError"), wa = $("#mvWhatsapp");
  var sum = { session: $("#sumSession"), couple: $("#sumCouple"), trainer: $("#sumTrainer"), nutrition: $("#sumNutrition"), extension: $("#sumExtension") };

  function checked(name) { return form.querySelector('input[name="' + name + '"]:checked'); }
  function val(name) { var el = checked(name); return el ? el.value : ""; }
  function label(name) { var el = checked(name); return el ? el.getAttribute("data-label") : ""; }
  function money(n) { return "₹" + Math.round(Number(n)).toLocaleString("en-IN"); }

  function total() {
    var t = CFG.base[val("session")] || 0;
    t += CFG.trainer[val("trainer")] || 0;
    if (val("couple") === "yes") t += CFG.couple;
    if (val("nutrition") === "yes") t += CFG.nutrition;
    if (val("extension") === CFG.extValue) t += CFG.ext;
    return t;
  }

  function whatsappLink() {
    var msg = "Hello TFI \uD83D\uDC4B\n\nI am interested in the " + cond + " plan (12 Weeks Virtual Training).\n\n" +
      "*My Selected Plan*\n" +
      "\u2022 Sessions: " + (label("session") || "Not selected") + "\n" +
      "\u2022 Training Type: " + (label("couple") || "Not selected") + "\n" +
      "\u2022 Trainer Level: " + (label("trainer") || "Not selected") + "\n" +
      "\u2022 Nutrition: " + (label("nutrition") || "Not selected") + "\n" +
      "\u2022 Extension: " + (label("extension") || "Not selected") + "\n\n" +
      "*Final Total: " + money(total()) + "*\n\n" +
      "Please share the final plan details and pricing. Thank you!";
    return "https://wa.me/" + WA_NUMBER + "?text=" + encodeURIComponent(msg);
  }

  /* ---- "Your plan" panel: sticky fix, meter, row flashes, count-up ---- */
  var bar = $(".mvp-bar");
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var meter = null, meterTxt = null, lastLabels = {}, shown = null, raf = 0, firstPaint = true;

  if (bar) {
    /* position: sticky fails if an ancestor clips with overflow:hidden, so
       use overflow:clip (same look, no scroll container) */
    for (var n = bar.parentElement; n && n !== document.body; n = n.parentElement) {
      var cs = window.getComputedStyle(n);
      if (/(hidden|auto|scroll)/.test(cs.overflowX + " " + cs.overflowY)) n.style.overflow = "clip";
    }
    meter = document.createElement("div");
    meter.className = "mx-meter";
    meter.setAttribute("aria-hidden", "true");
    // meter.innerHTML = "<i></i><b>0 of " + GROUPS.length + "</b>";
    meterTxt = meter.querySelector("b");
    bar.insertBefore(meter, bar.firstChild);
  }

  function setText(el, txt) { if (el) el.textContent = txt; }

  function showTotal(to) {
    var from = shown === null ? to : shown;
    shown = to;
    window.cancelAnimationFrame(raf);
    if (reduce || firstPaint || from === to) {
      setText(totalEl, money(to)); setText(stickyEl, money(to));
      return;
    }
    totalEl.classList.remove("mx-count"); void totalEl.offsetWidth; totalEl.classList.add("mx-count");
    var start = null, dur = 420;
    (function step(ts) {
      if (start === null) start = ts;
      var p = Math.min(1, (ts - start) / dur), e = 1 - Math.pow(1 - p, 3);
      var v = Math.round(from + (to - from) * e);
      setText(totalEl, money(v)); setText(stickyEl, money(v));
      if (p < 1) raf = window.requestAnimationFrame(step);
    })(performance.now());
  }

  function animatePanel(done) {
    if (!bar) return;
    bar.style.setProperty("--mx-p", done / GROUPS.length);
    bar.classList.toggle("is-ready", done === GROUPS.length);
    setText(meterTxt, done === GROUPS.length ? "Ready" : done + " of " + GROUPS.length);

    var nextSet = false;
    GROUPS.forEach(function (g) {
      var row = sum[g] && sum[g].parentElement;
      if (!row) return;
      var now = label(g);
      if (!firstPaint && now && now !== lastLabels[g]) {
        row.classList.remove("mx-flash"); void row.offsetWidth; row.classList.add("mx-flash");
      }
      lastLabels[g] = now;
      var isNext = !now && !nextSet;
      if (isNext) nextSet = true;
      row.classList.toggle("mx-next", isNext);
    });
    firstPaint = false;
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
    showTotal(t);
    if (perMonthEl) { perMonthEl.textContent = t ? "\u2248 " + money(Math.round(t / CFG.months)) + " / month" : ""; perMonthEl.style.display = t ? "" : "none"; }

    totalEl.classList.remove("pop");
    void totalEl.offsetWidth;
    totalEl.classList.add("pop");

    animatePanel(done);

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
      plan: "12-weeks",
      program: cond,
      session: val("session"),
      couple: val("couple"),
      nutrition: val("nutrition"),
      trainer: val("trainer"),
      extension: val("extension"),
      total: total()
    }).toString();
    window.location.href = "index.html" + q + "#contact";
  });

  /* WhatsApp: ask for every option first (same as the virtual pages) */
  if (wa) {
    wa.addEventListener("click", function (e) {
      if (GROUPS.some(function (g) { return !checked(g); })) {
        e.preventDefault();
        errorEl.textContent = "Please select all plan options before sending your enquiry.";
        errorEl.classList.remove("show");
        void errorEl.offsetWidth;
        errorEl.classList.add("show");
        return;
      }
      wa.href = whatsappLink();
    });
  }

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
