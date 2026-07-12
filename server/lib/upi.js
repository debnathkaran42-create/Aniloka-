/* =========================================================
   ANILOKA — UPI PAYMENT LINK BUILDER
   -----------------------------------------------------------
   Builds a standard UPI deep link (upi://pay?...) that opens
   any UPI app (Google Pay, PhonePe, Paytm, BHIM, etc.) with
   the amount and note pre-filled. This is the free, gateway-
   less UPI flow: there is no automatic payment confirmation —
   the user pays, then submits their UTR/Transaction ID, and
   an admin verifies it in the dashboard before Premium/chapter
   access is unlocked. That verification step is intentional
   and required; skipping it is how "free UPI" fraud happens.
   ========================================================= */

function buildUpiLink({ vpa, payeeName, amount, note, txnRef }) {
  const params = new URLSearchParams({
    pa: vpa,
    pn: payeeName,
    am: Number(amount).toFixed(2),
    cu: "INR",
    tn: note || "AniLoka Payment",
  });
  if (txnRef) params.set("tr", txnRef);
  return `upi://pay?${params.toString()}`;
}

module.exports = { buildUpiLink };
