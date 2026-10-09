/* =====================================================================
   TFI — Plan showcase pages (non-virtual)
   Shared by the monthly, 12-weeks and half-yearly non-virtual pages.

   To change a page's price, edit data-price on <main class="ps-page">.
   The big price, the sticky bar, the Continue link and the WhatsApp
   message all follow it.
   ===================================================================== */
(function () {
  "use strict";

  var root = document.querySelector(".ps-page");
  if (!root) return;

  document.documentElement.classList.add("ps-js");

  function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
  function qsa(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  /* ---------------------------------------------------------------
     1. Price + links (single source: data-price on <main>)
  ---------------------------------------------------------------- */
  var price = parseFloat(root.getAttribute("data-price"));
  var plan = root.getAttribute("data-plan") || "";
  var planName = root.getAttribute("data-plan-name") || document.title;
  var waNumber = root.getAttribute("data-whatsapp") || "918951077599";

  if (isFinite(price) && price > 0) {
    var priceText = "₹" + price.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    var bits = priceText.replace("₹", "").split(".");

    qsa("[data-ps-price]").forEach(function (el) {
      el.innerHTML =
        '<span class="ps-sr">' + priceText + "</span>" +
        '<span class="ps-cur" aria-hidden="true">₹</span>' +
        '<span class="ps-amt" aria-hidden="true">' + bits[0] + "</span>" +
        '<span class="ps-dec" aria-hidden="true">.' + bits[1] + "</span>";
    });
    qsa("[data-ps-price-text]").forEach(function (el) { el.textContent = priceText; });

    /* Continue With My Plan: same hand-off as before (index.html contact) */
    var params = new URLSearchParams({ plan: plan, total: Math.round(price) });
    var continueHref = "index.html?" + params.toString() + "#contact";
    qsa("[data-ps-continue]").forEach(function (a) { a.setAttribute("href", continueHref); });

    /* Enquire on WhatsApp */
    var message =
      "Hello TFI 👋\n\n" +
      "I am interested in the " + planName + " plan (" + priceText + ").\n\n" +
      "Please share the details and next steps. Thank you!";
    var waHref = "https://wa.me/" + waNumber + "?text=" + encodeURIComponent(message);
    qsa("[data-ps-wa]").forEach(function (a) { a.setAttribute("href", waHref); });
  }

  /* ---------------------------------------------------------------
     2. Media: show a clear hint until the real files are added
  ---------------------------------------------------------------- */
  qsa(".ps-media").forEach(function (box) {
    var img = qs("img", box);
    if (!img) return;
    box.setAttribute("data-src", img.getAttribute("src") || "");

    function missing() { box.classList.add("is-missing"); }
    img.addEventListener("error", missing);
    if (img.complete && img.naturalWidth === 0 && img.getAttribute("src")) missing();
  });

  /* ---------------------------------------------------------------
     3. Lightbox: open the images / GIF on the page itself
  ---------------------------------------------------------------- */
  var lb = qs("#psLb");
  var cards = qsa(".ps-card");

  if (lb && cards.length) {
    var lbImg = qs(".ps-lb-img", lb);
    var capTitle = qs(".ps-lb-cap b", lb);
    var capText = qs(".ps-lb-cap small", lb);
    var closeBtn = qs(".ps-lb-close", lb);
    var current = 0;
    var opener = null;
    var touchX = null;

    var paint = function (i) {
      current = (i + cards.length) % cards.length;
      var card = cards[current];
      var img = qs("img", card);
      var title = qs("figcaption b", card);
      var text = qs("figcaption small", card);

      lbImg.src = img.currentSrc || img.src;
      lbImg.alt = img.alt || "";
      capTitle.textContent = title ? title.textContent : "";
      capText.textContent = text ? text.textContent : "";
    };

    var openLb = function (i, from) {
      opener = from || null;
      paint(i);
      lb.hidden = false;
      document.documentElement.classList.add("ps-lock");
      closeBtn.focus();
    };

    var closeLb = function () {
      lb.hidden = true;
      lbImg.removeAttribute("src");
      document.documentElement.classList.remove("ps-lock");
      if (opener) opener.focus();
    };

    cards.forEach(function (card, i) {
      var box = qs(".ps-media", card);
      if (!box) return;
      box.addEventListener("click", function () {
        if (!box.classList.contains("is-missing")) openLb(i, box);
      });
    });

    qs(".ps-lb-prev", lb).addEventListener("click", function () { paint(current - 1); });
    qs(".ps-lb-next", lb).addEventListener("click", function () { paint(current + 1); });
    closeBtn.addEventListener("click", closeLb);

    lb.addEventListener("click", function (e) {
      if (e.target === lb || e.target.classList.contains("ps-lb-fig")) closeLb();
    });

    document.addEventListener("keydown", function (e) {
      if (lb.hidden) return;
      if (e.key === "Escape") { closeLb(); return; }
      if (e.key === "ArrowRight") { paint(current + 1); return; }
      if (e.key === "ArrowLeft") { paint(current - 1); return; }
      if (e.key === "Tab") {
        var btns = qsa("button", lb);
        var first = btns[0];
        var last = btns[btns.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    lb.addEventListener("touchstart", function (e) {
      touchX = e.changedTouches[0].clientX;
    }, { passive: true });
    lb.addEventListener("touchend", function (e) {
      if (touchX === null) return;
      var dx = e.changedTouches[0].clientX - touchX;
      touchX = null;
      if (Math.abs(dx) > 50) paint(current + (dx < 0 ? 1 : -1));
    }, { passive: true });
  }

  /* ---------------------------------------------------------------
     4. Sticky price bar: only when the price card / closing CTA /
        footer are out of view
  ---------------------------------------------------------------- */
  var sticky = qs("#psSticky");
  if (sticky && "IntersectionObserver" in window) {
    var inView = [];
    var stickyIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var at = inView.indexOf(entry.target);
        if (entry.isIntersecting && at === -1) inView.push(entry.target);
        if (!entry.isIntersecting && at !== -1) inView.splice(at, 1);
      });
      sticky.classList.toggle("is-on", inView.length === 0);
    }, { threshold: 0 });

    qsa(".ps-buy, .ps-cta, footer").forEach(function (el) { stickyIO.observe(el); });
  }

  /* ---------------------------------------------------------------
     5. Scroll reveal
  ---------------------------------------------------------------- */
  var reveals = qsa("[data-reveal]");

  /* Once an element has faded in, hand it back to its normal styles so
     hover effects and transitions behave as usual. */
  function settle(el) {
    window.setTimeout(function () {
      el.removeAttribute("data-reveal");
      el.classList.remove("is-in");
      el.style.removeProperty("--d");
    }, 1400);
  }
  function show(el) { el.classList.add("is-in"); settle(el); }

  var swipeRow = window.matchMedia && window.matchMedia("(max-width: 760px)").matches;

  if ("IntersectionObserver" in window) {
    var revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          show(entry.target);
          revealIO.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });

    reveals.forEach(function (el) {
      /* Cards in the swipeable mobile row are partly off-screen sideways,
         so show them straight away instead of waiting to be "seen". */
      if (swipeRow && el.classList.contains("ps-card")) { show(el); return; }
      revealIO.observe(el);
    });
  } else {
    reveals.forEach(show);
  }
})();