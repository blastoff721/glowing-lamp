// Success page: asks our server whether the PhonePe payment went through.
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var card = $("status");
  var orderId = new URLSearchParams(window.location.search).get("merchantOrderId") || "";

  function setState(state, title, text) {
    card.dataset.state = state;
    $("statusTitle").textContent = title;
    $("statusText").textContent = text;
    $("paidBlock").hidden = state !== "success";
    $("retryBtn").hidden = state !== "failed";
    $("refreshBtn").hidden = state !== "pending";
    if (orderId) $("helpRef").textContent = " (mention order ID " + orderId + ")";
  }

  if (!/^[A-Z]{2,20}_\d{13}_[a-f0-9]{6}$/.test(orderId)) {
    setState("failed", "Order not found", "This link has no valid order ID. If money was deducted, please contact us with your UPI / bank reference.");
    return;
  }

  var tries = 0;
  function check() {
    tries += 1;
    fetch("/api/orderstatus?orderId=" + encodeURIComponent(orderId), { cache: "no-store" })
      .then(function (res) { return res.json().then(function (body) { return { ok: res.ok, body: body }; }); })
      .then(function (r) {
        if (!r.ok) throw new Error(r.body.error || "error");
        var d = r.body;
        if (d.state === "COMPLETED") {
          $("txnId").textContent = d.transactionId || "-";
          $("orderId").textContent = d.orderId;
          $("copies").textContent = d.quantity || "-";
          $("amount").textContent = d.amountRupees != null ? d.amountRupees.toLocaleString("en-IN") : "-";
          setState("success", "Payment confirmed", "Thank you! Your order for the Virasat Diwali Anka 2026 is confirmed.");
        } else if (d.state === "PENDING") {
          // UPI payments can take a few seconds to settle: re-check automatically.
          setState("pending", "Payment processing", "Your bank has not confirmed the payment yet. This page checks again automatically.");
          if (tries < 6) setTimeout(check, 5000);
        } else {
          setState("failed", "Payment not completed", "The payment was cancelled or declined. If money was deducted, your bank usually reverses it automatically within a few working days. Contact us if it does not.");
        }
      })
      .catch(function () {
        setState("pending", "Could not check right now", "We could not reach the payment server. Please tap Check again in a moment.");
      });
  }

  $("refreshBtn").addEventListener("click", function () {
    setState("loading", "Verifying payment...", "Please wait a moment.");
    tries = 0;
    check();
  });

  check();
})();
