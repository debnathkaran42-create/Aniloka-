/* =========================================================
   ANILOKA — UPI PAYMENT PAGE
   -----------------------------------------------------------
   No free UPI method can auto-confirm a payment — this is the
   honest manual-verification flow: show a UPI QR/deep link,
   the user pays in their own app, submits the UTR, and an
   admin verifies it against their bank before access unlocks.
   Works two ways:
     - Real backend configured (js/api.js) -> server creates the
       transaction + real QR, admin verifies via the backend.
     - No backend yet -> stored locally as a "pending" request,
       reviewed in Admin Panel -> Manage Payments.
   ========================================================= */
(function () {
  if (!AUTH.requireLogin()) return;
  const session = DB.getSession();

  const type = qs("type") === "chapter" ? "chapter" : "premium";
  const planKey = qs("plan");
  const mangaId = qs("mangaId");
  const chapterId = qs("ch");

  let label = "", amount = 0, backendTxn = null;

  function resolveLocalOrder() {
    if (type === "premium") {
      const prices = DB.getSettings().premiumPrices || { weekly: 2.99, monthly: 8.99, yearly: 69.99 };
      const names = { weekly: "Weekly", monthly: "Monthly", yearly: "Yearly" };
      if (!prices[planKey]) return false;
      amount = prices[planKey];
      label = `AniLoka ${names[planKey] || planKey} Premium`;
      return true;
    }
    const manga = DB.getManga(mangaId);
    const chapter = manga?.chapters.find(c => c.id === chapterId);
    if (!manga || !chapter) return false;
    amount = Number(chapter.price || 0);
    label = `${manga.title} — ${chapter.title}`;
    return true;
  }

  async function init() {
    document.getElementById("pay-loading").classList.remove("hidden");

    if (typeof API !== "undefined" && API.isConfigured()) {
      try {
        const body = type === "premium" ? { plan: planKey } : { chapterId };
        const result = await API.createTransaction(body);
        backendTxn = result.transaction;
        amount = backendTxn.amount;
        label = type === "premium" ? `AniLoka ${planKey} Premium` : "Chapter Unlock";
        renderOrder();
        renderQr(result.qrCodeDataUrl, result.upiLink);
        return;
      } catch (e) {
        toast("Couldn't reach payment server, switching to manual UPI flow — " + e.message, "info");
      }
    }

    if (!resolveLocalOrder()) {
      document.getElementById("pay-root").innerHTML = `<div class="empty-state"><h3>Nothing to pay for</h3><p>This payment link looks incomplete.</p><a class="btn btn-primary" href="premium.html">Back to Premium</a></div>`;
      document.getElementById("pay-loading").classList.add("hidden");
      return;
    }
    renderOrder();
    buildLocalQr();
  }

  function renderOrder() {
    document.getElementById("item-name").textContent = label;
    document.getElementById("amount").innerHTML = `₹${amount.toFixed(2)}`;
    const settings = DB.getSettings();
    document.getElementById("vpa-text").textContent = settings.upiVpa || "yourupi@bank";
    document.getElementById("pay-loading").classList.add("hidden");
    document.getElementById("pay-content").classList.remove("hidden");
  }

  function localUpiLink() {
    const settings = DB.getSettings();
    const params = new URLSearchParams({
      pa: settings.upiVpa || "yourupi@bank",
      pn: settings.upiPayeeName || "AniLoka",
      am: amount.toFixed(2),
      cu: "INR",
      tn: label,
      tr: "aniloka_" + Date.now(),
    });
    return "upi://pay?" + params.toString();
  }

  function buildLocalQr() {
    const link = localUpiLink();
    renderQr(null, link);
  }

  function renderQr(dataUrl, upiLink) {
    const box = document.getElementById("qr-box");
    if (dataUrl) {
      box.innerHTML = `<img src="${dataUrl}" alt="UPI QR code">`;
    } else if (typeof AnilokaQR !== "undefined") {
      try {
        const qr = AnilokaQR.createQR(upiLink, "M");
        const count = qr.getModuleCount();
        const size = 200;
        const cell = size / count;
        const canvas = document.createElement("canvas");
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, size, size);
        ctx.fillStyle = "#111";
        for (let row = 0; row < count; row++) {
          for (let col = 0; col < count; col++) {
            if (qr.isDark(row, col)) ctx.fillRect(col * cell, row * cell, Math.ceil(cell), Math.ceil(cell));
          }
        }
        box.innerHTML = "";
        box.appendChild(canvas);
      } catch (e) {
        box.innerHTML = `<div style="color:#111;font-size:11px;text-align:center;padding:10px;">QR unavailable — use the Pay button below</div>`;
      }
    } else {
      box.innerHTML = `<div style="color:#111;font-size:11px;text-align:center;padding:10px;">QR unavailable — use the Pay button below</div>`;
    }
    document.getElementById("pay-upi-btn").href = upiLink;
  }

  document.getElementById("copy-vpa-btn").addEventListener("click", async () => {
    const vpa = document.getElementById("vpa-text").textContent;
    await navigator.clipboard.writeText(vpa);
    toast("UPI ID copied", "success");
  });

  document.getElementById("utr-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const utr = document.getElementById("utr-input").value.trim();
    if (utr.length < 6) { toast("Enter a valid UTR / Transaction ID", "error"); return; }

    const btn = document.getElementById("submit-utr-btn");
    btn.disabled = true; btn.textContent = "Submitting…";

    try {
      if (backendTxn) {
        await API.submitUtr(backendTxn.id, utr);
      } else {
        DB.createPaymentRequest({
          uid: session.uid, username: session.username, email: session.email,
          type, plan: type === "premium" ? planKey : null,
          mangaId: type === "chapter" ? mangaId : null,
          chapterId: type === "chapter" ? chapterId : null,
          label, amount, utr,
        });
      }
      showPendingScreen();
    } catch (err) {
      toast(err.message || "Couldn't submit payment", "error");
      btn.disabled = false; btn.textContent = "Submit Payment";
    }
  });

  function showPendingScreen() {
    document.getElementById("pay-content").classList.add("hidden");
    const screen = document.getElementById("pay-status-screen");
    screen.classList.remove("hidden");
    screen.innerHTML = `
      <div class="status-icon">${icon("check", 34)}</div>
      <h2>Payment Submitted</h2>
      <p>We've received your UTR for <b>${escapeHTML(label)}</b> (₹${amount.toFixed(2)}). An admin will verify it against the bank statement shortly — you'll get a notification once it's approved.</p>
      <a class="btn btn-primary" href="profile.html">View My Purchases</a>`;
  }

  init();
  initNav("");
  hidePageLoader();
})();
