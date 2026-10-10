// Tailwind config: loaded synchronously right after the Tailwind CDN script, before first paint.
tailwind.config = {
  theme: {
    extend: {
      fontFamily: { sans: ["Geist", "ui-sans-serif", "system-ui", "sans-serif"], mono: ["Geist Mono", "ui-monospace", "monospace"] },
      colors: { ink: "#121111", mute: "#8A8A90", pill: "#16151A", accent: "#FF2E2E" }
    }
  }
};

document.addEventListener("DOMContentLoaded", function () {
  var API_BASE = "https://api.pointcapitalis.com";

  // Floating glass top bar on scroll
  var bar = document.getElementById("bar");
  function onScroll() { bar.classList.toggle("is-scrolled", window.scrollY > 40); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Waitlist forms: same endpoint and fields as before (POST /api/waitlist: email, platforms, follower_estimate, source)
  function setMessage(form, text, isError) {
    var msg = form.parentElement.querySelector(".waitlist-msg") || form.querySelector(".waitlist-msg");
    if (!msg) return;
    msg.textContent = text;
    msg.style.color = isError ? "#FF2E2E" : "";
  }

  async function handleWaitlist(event) {
    event.preventDefault();
    var form = event.currentTarget;
    var btn = form.querySelector("button[type=submit]");
    var label = btn.querySelector(".btn-label");
    var idle = label.textContent;
    var email = (form.querySelector("input[name=email]").value || "").trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setMessage(form, "That email doesn't look right. Check it and try again.", true);
      return;
    }
    var platforms = Array.prototype.slice.call(form.querySelectorAll("input[name=platforms]:checked")).map(function (el) { return el.value; });
    var followerSelect = form.querySelector("select[name=follower_estimate]");
    var followerEstimate = followerSelect && followerSelect.value ? parseInt(followerSelect.value, 10) : null;

    btn.disabled = true;
    label.textContent = "Sending...";
    setMessage(form, "", false);
    try {
      var res = await fetch(API_BASE + "/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email, platforms: platforms, follower_estimate: followerEstimate, source: form.dataset.source || "landing" })
      });
      if (res.ok) {
        setMessage(form, "You're on the list. We'll email you.", false);
        form.reset();
      } else if (res.status === 429) {
        setMessage(form, "Too many attempts. Wait a moment and try again.", true);
      } else {
        setMessage(form, "Something went wrong. Please try again in a moment.", true);
      }
    } catch (err) {
      setMessage(form, "Couldn't reach the server. Check your connection and try again.", true);
    } finally {
      btn.disabled = false;
      label.textContent = idle;
    }
  }
  document.querySelectorAll(".waitlist-form").forEach(function (f) { f.addEventListener("submit", handleWaitlist); });

  // Hand-off to company sign-up. Contract: /company/login?tab=register&name=&about=&status=&launch=&sale=&url=
  // Empty values are omitted; the server validates and caps everything.
  function goRegister(fields) {
    var q = ["tab=register"];
    Object.keys(fields).forEach(function (k) { if (fields[k]) q.push(k + "=" + encodeURIComponent(fields[k])); });
    window.location.href = API_BASE + "/company/login?" + q.join("&");
  }

  // Hero URL box: website, app-store or social link.
  var urlForm = document.getElementById("url-form");
  if (urlForm) {
    urlForm.addEventListener("submit", function (event) {
      event.preventDefault();
      var raw = urlForm.querySelector("input[name=website]").value.trim();
      var url = "";
      if (raw) {
        url = /^https?:\/\//i.test(raw) ? raw : "https://" + raw;
        if (!/^https?:\/\/[^\s/]+\.[^\s/]+/i.test(url)) {
          setMessage(urlForm, "That doesn't look like a website address.", true);
          return;
        }
      }
      goRegister({ url: url });
    });
  }

  // "No website yet?" card: URL box swaps in place for four questions, one at a time.
  var startForm = document.getElementById("start-form");
  var urlBox = document.getElementById("hero-url");
  if (startForm && urlBox) {
    var steps = startForm.querySelectorAll(".step");
    var nameEl = startForm.elements.name, aboutEl = startForm.elements.about, launchEl = startForm.elements.launch;
    var goBtn = document.getElementById("start-go");
    var countEl = document.getElementById("sf-about-count");
    var launchWrap = document.getElementById("sf-launch-wrap");
    var chips = startForm.querySelectorAll("[data-when]");
    var MIN_ABOUT = 20;
    var revealed = 1;

    function val(name) { var r = startForm.querySelector("input[name=" + name + "]:checked"); return r ? r.value : ""; }
    function valid() {
      var n = nameEl.value.trim().length, a = aboutEl.value.trim().length;
      return n >= 1 && a >= MIN_ABOUT && !!val("status") && !!val("sale");
    }
    function refresh() {
      var a = aboutEl.value.trim().length;
      countEl.textContent = a < MIN_ABOUT ? (MIN_ABOUT - a) + " more characters needed" : a + " / 1500";
      goBtn.disabled = !valid();
    }
    function reveal(n, focus) {
      if (n <= revealed) return;
      revealed = n;
      var step = steps[n - 1];
      step.hidden = false;
      step.classList.add("rise");
      if (focus) {
        var target = step.querySelector("textarea, input:not([type=radio]), input[type=radio]:not([hidden])");
        var firstChip = step.querySelector(".chip:not([hidden]) input");
        (firstChip || target).focus();
      }
    }
    function filterChips() {
      var st = val("status");
      chips.forEach(function (c) {
        var ok = c.dataset.when.split(" ").indexOf(st) !== -1;
        c.hidden = !ok;
        if (!ok) c.querySelector("input").checked = false;
      });
    }
    function openCard() {
      urlBox.hidden = true;
      startForm.hidden = false;
      startForm.classList.add("rise");
      startForm.scrollIntoView({ block: "center" });
      nameEl.focus({ preventScroll: true });
    }
    function closeCard() {
      startForm.hidden = true;
      urlBox.hidden = false;
      urlBox.classList.add("rise");
      document.getElementById("hero-website").focus({ preventScroll: true });
    }

    nameEl.addEventListener("input", refresh);
    nameEl.addEventListener("change", function () { if (nameEl.value.trim()) reveal(2, false); });
    nameEl.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); if (nameEl.value.trim()) reveal(2, true); }
    });
    aboutEl.addEventListener("input", function () {
      if (aboutEl.value.trim().length >= MIN_ABOUT) reveal(3, false);
      refresh();
    });
    startForm.querySelectorAll("input[name=status]").forEach(function (r) {
      r.addEventListener("change", function () {
        launchWrap.hidden = r.value !== "soon";
        if (r.value !== "soon") launchEl.value = "";
        filterChips();
        reveal(4, true);
        refresh();
      });
    });
    startForm.querySelectorAll("input[name=sale]").forEach(function (r) { r.addEventListener("change", refresh); });
    filterChips();
    refresh();

    document.querySelectorAll("[data-open-card]").forEach(function (a) {
      a.addEventListener("click", function (e) { e.preventDefault(); openCard(); });
    });
    document.getElementById("start-back").addEventListener("click", closeCard);
    startForm.addEventListener("keydown", function (e) { if (e.key === "Escape") closeCard(); });
    startForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!valid()) return;
      var soon = val("status") === "soon";
      goRegister({
        name: nameEl.value.trim(), about: aboutEl.value.trim(), status: val("status"),
        launch: soon ? launchEl.value : "", sale: val("sale")
      });
    });
  }
});
