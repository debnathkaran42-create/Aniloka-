/* =========================================================
   UPI PAYMENT LINK + QR GENERATOR
   -----------------------------------------------------------
   Builds a standard UPI deep link (works with GPay, PhonePe,
   Paytm, BHIM, and any other UPI app) and a QR code image for
   it. This does NOT verify payment automatically — no free UPI
   method can do that without a payment gateway. The flow is:
     1. User taps "Pay with UPI" -> this link/QR opens their app
     2. User pays, then types in the UTR/Transaction ID here
     3. Admin checks their bank/UPI app and verifies the UTR
     4. Only then does the backend mark premium as active
   ========================================================= */
const QRCode = require("qrcode");
const config = require("../config/env");

function buildUpiLink({ amount, transactionNote, transactionRefId }) {
  const params = new URLSearchParams({
    pa: config.UPI_VPA,                 // payee VPA (your UPI ID)
    pn: config.UPI_PAYEE_NAME,          // payee name
    am: amount.toFixed(2),              // amount
    cu: "INR",
    tn: transactionNote,                // shown in the paying app
    tr: transactionRefId,               // your own reference id
  });
  return `upi://pay?${params.toString()}`;
}

async function buildUpiQrDataUrl(upiLink) {
  return QRCode.toDataURL(upiLink, { margin: 1, width: 320 });
}

module.exports = { buildUpiLink, buildUpiQrDataUrl };
