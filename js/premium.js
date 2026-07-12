/* ANILOKA — PREMIUM PAGE
   -----------------------------------------------------------
   Tries real Razorpay Checkout first (js/payment-config.js) if
   configured. Otherwise routes to the real free UPI payment
   page (payment.html) — QR code + manual admin verification.
   ========================================================= */
(function () {
  if (!AUTH.requireLogin()) return;
  const session = DB.getSession();
  let user = DB.getUser(session.uid);

  let selectedPlan = null;

  const prices = DB.getSettings().premiumPrices || { weekly: 2.99, monthly: 8.99, yearly: 69.99 };
  const PLANS = {
    weekly: { label: "Weekly", price: `₹${prices.weekly.toFixed(2)}`, amount: prices.weekly, period: "/week" },
    monthly: { label: "Monthly", price: `₹${prices.monthly.toFixed(2)}`, amount: prices.monthly, period: "/month" },
    yearly: { label: "Yearly", price: `₹${prices.yearly.toFixed(2)}`, amount: prices.yearly, period: "/year" }
  };

  // Reflect current prices on the visible plan cards (admin can edit these in Admin Panel → Site Settings)
  document.querySelectorAll(".plan-card .btn[data-plan]").forEach(btn => {
    const plan = PLANS[btn.dataset.plan];
    const priceEl = btn.closest(".plan-card").querySelector(".plan-price");
    if (priceEl && plan) priceEl.innerHTML = `${plan.price}<span>${plan.period}</span>`;
  });

  function renderStatus() {
    const banner = document.getElementById("current-plan-banner");
    if (user.isPremium) {
      banner.classList.remove("hidden");
      banner.querySelector(".plan-detail").textContent = `${PLANS[user.premiumPlan]?.label || "Premium"} plan active`;
    } else {
      banner.classList.add("hidden");
    }
    document.querySelectorAll(".plan-card .btn").forEach(btn => {
      const isCurrent = user.isPremium && btn.dataset.plan === user.premiumPlan;
      btn.textContent = isCurrent ? "Current Plan" : "Choose Plan";
      btn.disabled = isCurrent;
    });
  }

  function grantPremium(plan, meta) {
    user = DB.saveUser(session.uid, { isPremium: true, premiumPlan: plan });
    const purchases = DB._read("aniloka_purchases_" + session.uid, []);
    purchases.unshift({ plan: PLANS[plan].label, date: new Date().toLocaleDateString(), ...meta });
    DB._write("aniloka_purchases_" + session.uid, purchases);
    toast(`Welcome to AniLoka Premium — ${PLANS[plan].label} plan active!`, "success");
    applyPremiumTheme();
    renderStatus();
  }

  document.querySelectorAll(".plan-card .btn").forEach(btn => {
    btn.addEventListener("click", () => {
      selectedPlan = btn.dataset.plan;
      const p = PLANS[selectedPlan];

      const openedReal = openRazorpayCheckout({
        amountRupees: p.amount,
        description: `AniLoka Premium — ${p.label} Plan`,
        prefillEmail: session.email,
        onSuccess: (response) => grantPremium(selectedPlan, { razorpay_payment_id: response.razorpay_payment_id, real: true })
      });
      if (openedReal) return;

      // Free default: real UPI payment page (QR + manual admin verification)
      window.location.href = `payment.html?type=premium&plan=${selectedPlan}`;
    });
  });

  document.getElementById("cancel-premium")?.addEventListener("click", () => {
    if (!confirm("Cancel your Premium subscription?")) return;
    user = DB.saveUser(session.uid, { isPremium: false, premiumPlan: null });
    applyPremiumTheme();
    renderStatus();
    toast("Premium canceled. You've been moved back to the free plan.", "info");
  });

  renderStatus();
  initNav("premium");
  hidePageLoader();
})();
