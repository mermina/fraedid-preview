// Fræið: mobile menu + sending the two forms to Emilia's Google Apps Script.
(function () {
  // ---- menu ----
  var header = document.querySelector(".site-header");
  var btn = document.querySelector(".menu-btn");
  var setOpen = function () {};
  if (btn) {
    var label = btn.querySelector(".menu-label");
    setOpen = function (open) {
      header.classList.toggle("menu-open", open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      label.textContent = open ? btn.dataset.close : btn.dataset.open;
    };
    btn.addEventListener("click", function () { setOpen(!header.classList.contains("menu-open")); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") setOpen(false); });
    document.querySelectorAll(".nav a").forEach(function (a) { a.addEventListener("click", function () { setOpen(false); }); });
  }
  // Show the full menu only when it fits on one line; otherwise the "Menu" button.
  // Measured with the full menu switched on for a moment (no repaint in between).
  var row = document.querySelector(".header-row");
  var lastWidth = 0;
  var fit = function () {
    if (window.innerWidth === lastWidth) return;   // phones fire resize on scroll; only width matters
    lastWidth = window.innerWidth;
    var wasCollapsed = header.classList.contains("nav-collapsed");
    header.classList.remove("nav-collapsed");
    var tooWide = row.scrollWidth > row.clientWidth + 1;
    header.classList.toggle("nav-collapsed", tooWide);
    if (wasCollapsed && !tooWide && btn) setOpen(false);
  };
  fit();
  window.addEventListener("resize", fit);
  if (document.fonts) document.fonts.ready.then(function () { lastWidth = 0; fit(); });   // re-check once web fonts load
  window.addEventListener("scroll", function () { header.classList.toggle("scrolled", window.scrollY > 8); }, { passive: true });

  // ---- Treatments dropdown: click or Enter opens; Escape, outside click or tabbing away closes ----
  document.querySelectorAll(".dd").forEach(function (dd) {
    var b = dd.querySelector(".dd-btn");
    var set = function (open) { dd.classList.toggle("open", open); b.setAttribute("aria-expanded", open ? "true" : "false"); };
    b.addEventListener("click", function () { set(!dd.classList.contains("open")); });
    document.addEventListener("click", function (e) { if (!dd.contains(e.target)) set(false); });
    dd.addEventListener("keydown", function (e) { if (e.key === "Escape") { set(false); b.focus(); } });
    dd.addEventListener("focusout", function (e) { if (!dd.contains(e.relatedTarget)) set(false); });
  });

  // ---- booking form: preselect the service from ?medferd=... (the "Bóka tíma" buttons) ----
  var pick = new URLSearchParams(location.search).get("medferd");
  if (pick) {
    var radio = document.querySelector('input[name="service"][data-key="' + pick + '"]');
    if (radio) radio.checked = true;
  }

  // ---- forms ----
  document.querySelectorAll(".js-form").forEach(function (form) {
    var status = form.querySelector(".form-status");
    var submit = form.querySelector('button[type="submit"]');
    var show = function (text, isError) {
      status.hidden = false;
      status.textContent = text;
      status.classList.toggle("error", !!isError);
    };

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      // simple checks: required fields filled, email looks like an email
      var bad = null;
      form.querySelectorAll("[required]").forEach(function (el) {
        var ok = el.type === "radio" ? form.querySelector('input[name="' + el.name + '"]:checked') : el.value.trim() && el.checkValidity();
        el.classList.toggle("invalid", !ok && el.type !== "radio");
        if (!ok && !bad) bad = el;
      });
      if (bad) { bad.focus(); return; }

      var endpoint = form.dataset.endpoint;
      if (!endpoint) { show(form.dataset.notconnected, true); return; }

      // Several "when" boxes can be ticked: join them into one value for the sheet.
      var data = new FormData(form);
      var body = new URLSearchParams();
      var seen = {};
      data.forEach(function (value, key) {
        if (seen[key] !== undefined) { body.set(key, seen[key] + ", " + value); seen[key] += ", " + value; }
        else { body.append(key, value); seen[key] = value; }
      });

      submit.disabled = true;
      var original = submit.textContent;
      submit.textContent = form.dataset.sending;
      // Apps Script can't send CORS headers back, so "no-cors": we can't read the reply,
      // only know the request left. The auto-reply email is the real confirmation.
      fetch(endpoint, { method: "POST", mode: "no-cors", body: body })
        .then(function () { form.reset(); show(form.dataset.thanks); })
        .catch(function () { show(form.dataset.error, true); })
        .finally(function () { submit.disabled = false; submit.textContent = original; });
    });
  });
})();
