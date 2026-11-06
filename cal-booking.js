/* =========================================================
   Cal.com booking popup
   ---------------------------------------------------------
   - After the contact form is sent successfully (script.js fires the
     "lead:submitted" event), the Cal.com calendar opens in a popup on top
     of the page, with the visitor's data already filled in.
   - Any element with the attribute [data-cal-open] opens the same popup
     without pre-filling anything.
   - When the visitor books: the popup closes and a thank-you message shows.
   - When the visitor closes the popup without booking: a soft message and
     an "Agendar llamada" button to open the calendar again.

   The form itself is NOT touched here: the email with the lead's data is
   still sent by script.js exactly as before. No API keys are needed — the
   Cal.com embed is public.
   ========================================================= */
(function () {
  'use strict';

  // ---------- Settings (change here) ----------
  var CAL_LINK = 'denys-vasquez-d3ccjx/llamada-de-estrategia-con-denvasweb';
  var CAL_ORIGIN = 'https://cal.com';
  var CAL_EMBED_SRC = 'https://app.cal.com/embed/embed.js';
  var THEME = 'light';            // the site uses a light (cream) design
  var BRAND_COLOR = '#A9822F';    // --gold from style.css
  var CLOSE_DELAY_MS = 1500;      // how long the visitor sees Cal's own confirmation before the popup closes (0 = close right away)

  var MSG_BOOKED = '¡Listo! Tu llamada quedó agendada. Te enviamos la confirmación a tu correo.';
  var MSG_NOT_BOOKED = 'Recibimos tus datos, te contactaremos pronto.';

  // ---------- State ----------
  var calLoaded = false;
  var booked = false;      // did the visitor book during the current popup?
  var modalOpen = false;
  var lastLead = null;     // data from the last form submission
  var closeTimer = null;

  // ---------- Analytics ----------
  // GA4 is already on the site. The Meta Pixel is not on this page yet:
  // when it is added, the fbq() lines below start working with no changes.
  function track(name) {
    try {
      if (typeof gtag === 'function') {
        gtag('event', name === 'Lead' ? 'generate_lead' : 'schedule_call', {
          event_category: 'cal_booking',
          page_location: window.location.href
        });
      }
      if (typeof fbq === 'function') {
        fbq('track', name); // "Lead" and "Schedule" are Meta's standard events
      }
    } catch (e) { /* tracking must never break the page */ }
  }

  // ---------- Phone: international format ----------
  // "347 555 1234" -> "+13475551234". If the country can't be told, returns ""
  // so the visitor types it in the calendar instead of getting a wrong number.
  function toE164(raw) {
    if (!raw) return '';
    var s = String(raw).trim();
    var digits = s.replace(/\D/g, '');
    if (!digits) return '';
    if (s.charAt(0) === '+') return digits.length >= 8 && digits.length <= 15 ? '+' + digits : '';
    if (digits.indexOf('00') === 0) return '+' + digits.slice(2);
    if (digits.length === 10) return '+1' + digits;                          // US number without country code
    if (digits.length === 11 && digits.charAt(0) === '1') return '+' + digits; // 1 + US number
    return '';
  }

  // ---------- Load the Cal.com embed (official snippet) ----------
  function loadCal() {
    if (calLoaded) return;
    calLoaded = true;

    (function (C, A, L) {
      var p = function (a, ar) { a.q.push(ar); };
      var d = C.document;
      C.Cal = C.Cal || function () {
        var cal = C.Cal;
        var ar = arguments;
        if (!cal.loaded) {
          cal.ns = {};
          cal.q = cal.q || [];
          d.head.appendChild(d.createElement('script')).src = A;
          cal.loaded = true;
        }
        if (ar[0] === L) {
          var api = function () { p(api, arguments); };
          var namespace = ar[1];
          api.q = api.q || [];
          if (typeof namespace === 'string') {
            cal.ns[namespace] = cal.ns[namespace] || api;
            p(cal.ns[namespace], ar);
            p(cal, ['initNamespace', namespace]);
          } else p(cal, ar);
          return;
        }
        p(cal, ar);
      };
    })(window, CAL_EMBED_SRC, 'init');

    Cal('init', { origin: CAL_ORIGIN });

    // Match the popup to the site's look
    var vars = { 'cal-brand': BRAND_COLOR };
    Cal('ui', {
      theme: THEME,
      cssVarsPerTheme: { light: vars, dark: vars },
      hideEventTypeDetails: false,
      layout: 'month_view'
    });

    // The visitor booked (V2 is the current event; the old name is a backup)
    Cal('on', { action: 'bookingSuccessfulV2', callback: onBooked });
    Cal('on', { action: 'bookingSuccessful', callback: onBooked });

    watchModal();
  }

  // ---------- Open the popup ----------
  function openCal(lead) {
    loadCal();
    booked = false;
    clearTimeout(closeTimer);
    hideRetry();

    var config = { layout: 'month_view', theme: THEME };
    if (lead) {
      var phone = toE164(lead.phone);
      if (lead.name)     config.name = String(lead.name).trim();
      if (lead.email)    config.email = String(lead.email).trim();
      if (phone)         config.phone = phone;
      if (lead.business) config.business = String(lead.business).trim();
    }
    Cal('modal', { calLink: CAL_LINK, config: config });
  }

  // ---------- Messages ----------
  function statusEl() { return document.getElementById('form-status'); }

  function getRetryBtn() {
    var btn = document.getElementById('cal-retry');
    if (btn) return btn;
    var status = statusEl();
    if (!status) return null;
    btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'cal-retry';
    btn.className = 'btn btn-ghost btn-full cal-retry';
    btn.textContent = 'Agendar llamada';
    btn.hidden = true;
    btn.addEventListener('click', function () { openCal(lastLead); });
    status.insertAdjacentElement('afterend', btn);
    return btn;
  }
  // Optional WhatsApp button: shown only when the page passes a "whatsappUrl" with the lead
  // (the landing pages do; the home page doesn't).
  function getWaBtn() {
    var btn = document.getElementById('cal-wa');
    if (btn) return btn;
    var retry = getRetryBtn();
    if (!retry) return null;
    btn = document.createElement('a');
    btn.id = 'cal-wa';
    btn.className = 'btn btn-ghost btn-full cal-retry cal-wa';
    btn.target = '_blank';
    btn.rel = 'noopener';
    btn.textContent = 'Escríbenos por WhatsApp';
    btn.hidden = true;
    retry.insertAdjacentElement('afterend', btn);
    return btn;
  }
  function showRetry() {
    var b = getRetryBtn();
    if (b) b.hidden = false;
    if (lastLead && lastLead.whatsappUrl) {
      var w = getWaBtn();
      if (w) { w.href = lastLead.whatsappUrl; w.hidden = false; }
    }
  }
  function hideRetry() {
    ['cal-retry', 'cal-wa'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.hidden = true;
    });
  }

  function showMessage(text, success) {
    var status = statusEl();
    if (!status) return;
    status.textContent = text;
    status.style.color = success ? '#16A34A' : 'var(--text)';
  }

  // ---------- Booking finished ----------
  function onBooked() {
    if (booked) return;      // both event names can fire for the same booking
    booked = true;
    track('Schedule');
    closeTimer = setTimeout(function () {
      try { Cal('closeModal'); } catch (e) { /* the popup may already be closed */ }
      showMessage(MSG_BOOKED, true);
      hideRetry();
    }, CLOSE_DELAY_MS);
  }

  // ---------- Popup closed without booking ----------
  // Cal.com has no "closed" event, so we watch its popup element
  // (<cal-modal-box>) for being hidden, marked "closed", or removed.
  function isModalOpen() {
    var box = document.querySelector('cal-modal-box');
    if (!box) return false;
    if (box.getAttribute('state') === 'closed') return false;
    var cs = window.getComputedStyle(box);
    return cs.display !== 'none' && cs.visibility !== 'hidden';
  }

  function watchModal() {
    var pending = null;
    var check = function () {
      var open = isModalOpen();
      if (open) {
        clearTimeout(pending);
        pending = null;
        modalOpen = true;
      } else if (modalOpen && !pending) {
        // wait a moment: Cal can flicker while it switches between loading and loaded
        pending = setTimeout(function () {
          pending = null;
          if (!isModalOpen() && modalOpen) {
            modalOpen = false;
            onClosed();
          }
        }, 400);
      }
    };
    new MutationObserver(check).observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['state', 'style', 'class', 'hidden']
    });
  }

  function onClosed() {
    if (booked) return;      // booked: the thank-you message is handled in onBooked
    showMessage(MSG_NOT_BOOKED, false);
    showRetry();
  }

  // ---------- Wiring ----------
  // 1) Form sent OK -> track the lead and open the calendar with the data
  document.addEventListener('lead:submitted', function (e) {
    lastLead = (e && e.detail) || {};
    if (!lastLead.tracked) track('Lead');   // pages that already measure the lead pass tracked:true
    openCal(lastLead);
  });

  // 2) "Agenda tu llamada gratis" buttons -> open without pre-filling
  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('[data-cal-open]');
    if (!btn) return;
    e.preventDefault();
    openCal(null);
  });

  // 3) Warm up the embed as soon as the visitor shows interest,
  //    so the popup opens fast when they hit send.
  var form = document.getElementById('contact-form');
  if (form) {
    form.addEventListener('focusin', loadCal, { once: true });
  }
  window.addEventListener('submit', function (e) {
    if (e.target && e.target.id === 'contact-form') hideRetry();
  }, true);
  document.addEventListener('pointerover', function (e) {
    if (e.target.closest && e.target.closest('[data-cal-open]')) loadCal();
  });
  document.addEventListener('touchstart', function (e) {
    if (e.target.closest && e.target.closest('[data-cal-open]')) loadCal();
  }, { passive: true });
})();
