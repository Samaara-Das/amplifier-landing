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

  // Hero URL box: sends the visitor into the existing company flow.
  // shortcut: the server ignores ?website= today; pre-filling the wizard needs a server change.
  var urlForm = document.getElementById("url-form");
  if (urlForm) {
    urlForm.addEventListener("submit", function (event) {
      event.preventDefault();
      var raw = urlForm.querySelector("input[name=website]").value.trim();
      var target = API_BASE + "/company/login";
      if (raw) {
        var url = /^https?:\/\//i.test(raw) ? raw : "https://" + raw;
        if (!/^https?:\/\/[^\s/]+\.[^\s/]+/i.test(url)) {
          setMessage(urlForm, "That doesn't look like a website address.", true);
          return;
        }
        target += "?website=" + encodeURIComponent(url);
      }
      window.location.href = target;
    });
  }
});
