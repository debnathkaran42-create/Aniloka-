/* =========================================================
   GOOGLE ADSENSE CONFIG — PLACEHOLDER
   -----------------------------------------------------------
   1. Join AdSense for free at https://adsense.google.com
   2. Once approved, copy your publisher ID (looks like
      "ca-pub-1234567890123456") and paste it below.
   Ads won't actually show until Google approves your site on
   a real live domain — until then, and while this is still a
   placeholder, the site shows a styled "Advertisement" box
   instead so layouts still look right.
   ========================================================= */
const ADSENSE_CLIENT_ID = "ca-pub-XXXXXXXXXXXXXXXX";

function adsenseConfigured() {
  return ADSENSE_CLIENT_ID && !ADSENSE_CLIENT_ID.includes("XXXX");
}

/* Turns every placeholder .ad-slot on the page into a real AdSense unit
   when configured; otherwise leaves the styled placeholder box alone.
   Also bumps a local (approximate, not real revenue) impression counter
   the admin dashboard can show under Manage Ads. */
function initAds() {
  const settings = (typeof DB !== "undefined") ? DB.getSettings() : {};
  if (settings.adsEnabled === false) {
    document.querySelectorAll(".ad-slot").forEach(el => el.classList.add("hidden"));
    return;
  }

  const slots = document.querySelectorAll(".ad-slot");
  if (!slots.length) return;

  if (adsenseConfigured()) {
    if (!document.querySelector('script[src*="adsbygoogle.js"]')) {
      const s = document.createElement("script");
      s.async = true;
      s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`;
      s.crossOrigin = "anonymous";
      document.head.appendChild(s);
    }
    slots.forEach(el => {
      el.innerHTML = `<ins class="adsbygoogle" style="display:block;width:100%;height:100%"
        data-ad-client="${ADSENSE_CLIENT_ID}" data-ad-format="auto" data-full-width-responsive="true"></ins>`;
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
    });
  }

  // Local impression counter — approximate only, NOT real AdSense earnings data.
  // Real revenue must be checked in your AdSense dashboard and logged manually
  // in Admin Panel → Manage Ads, since AdSense's real numbers aren't available
  // to a static front-end without a backend + OAuth.
  if (typeof DB !== "undefined") {
    const count = DB._read("aniloka_ad_impressions", 0);
    DB._write("aniloka_ad_impressions", count + slots.length);
  }
}

document.addEventListener("DOMContentLoaded", initAds);
