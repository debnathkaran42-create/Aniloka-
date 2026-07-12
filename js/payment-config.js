/* =========================================================
   RAZORPAY CONFIG — PLACEHOLDER
   -----------------------------------------------------------
   Get a free Razorpay account at https://razorpay.com, then
   Dashboard → Settings → API Keys → copy your Key ID below.
   No backend required for this basic flow — Razorpay's
   Checkout handles the payment UI directly from the browser.
   Until you replace this, the site automatically falls back
   to a simulated (fake) checkout so everything still works.
   ========================================================= */
const RAZORPAY_KEY_ID = "YOUR_RAZORPAY_KEY_ID";

function razorpayConfigured() {
  return typeof Razorpay !== "undefined" && RAZORPAY_KEY_ID && !RAZORPAY_KEY_ID.startsWith("YOUR_");
}

/**
 * Opens real Razorpay Checkout for an INR amount.
 * amountRupees: number, e.g. 8.99
 * description: string shown in the checkout modal
 * onSuccess(response): called when payment completes
 * Returns true if Razorpay Checkout was actually opened, false if not configured (caller should fall back).
 */
function openRazorpayCheckout({ amountRupees, description, prefillEmail, onSuccess }) {
  if (!razorpayConfigured()) return false;
  try {
    const rzp = new Razorpay({
      key: RAZORPAY_KEY_ID,
      amount: Math.max(100, Math.round(amountRupees * 100)), // paise, Razorpay minimum ~ ₹1
      currency: "INR",
      name: "AniLoka",
      description,
      prefill: { email: prefillEmail || "" },
      theme: { color: "#d4af37" },
      handler: function (response) { onSuccess(response); },
      modal: { ondismiss: function () {} }
    });
    rzp.open();
    return true;
  } catch (e) {
    console.warn("Razorpay failed to open, falling back to simulated checkout.", e);
    return false;
  }
}
