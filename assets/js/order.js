// Order form for virasat.html.
// PRICE here is only for showing the total. The real price is set on the
// server in api/_lib.js, so changing this number cannot change what is charged.
(function () {
  var PRICE = 349;
  var MAX_QTY = 10;

  var form = document.getElementById("orderForm");
  var qtyInput = document.getElementById("quantity");
  var qtyOut = document.getElementById("qtyOut");
  var total = document.getElementById("total");
  var errorBox = document.getElementById("formError");
  var payBtn = document.getElementById("payBtn");

  // Quantity stepper
  form.querySelectorAll("[data-step]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var q = Number(qtyInput.value) + Number(btn.dataset.step);
      q = Math.min(MAX_QTY, Math.max(1, q));
      qtyInput.value = q;
      qtyOut.textContent = q;
      total.textContent = (q * PRICE).toLocaleString("en-IN");
    });
  });

  // Phone and PIN: digits only
  ["phone", "pincode"].forEach(function (id) {
    var el = document.getElementById(id);
    el.addEventListener("input", function () { el.value = el.value.replace(/\D/g, ""); });
  });

  // Clear the red border as soon as a field is fixed
  form.addEventListener("input", function (e) {
    if (e.target.classList.contains("invalid") && e.target.checkValidity()) e.target.classList.remove("invalid");
  });

  function showError(message, scroll) {
    errorBox.textContent = message;
    errorBox.classList.add("show");
    if (scroll) errorBox.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  var MESSAGES = {
    name: "Please enter your full name.",
    phone: "Please enter a valid 10-digit WhatsApp number.",
    email: "Please enter a valid email address.",
    address1: "Please enter your house / flat number and building.",
    address2: "Please enter your street, area or locality.",
    city: "Please enter your city or town.",
    pincode: "Please enter a valid 6-digit PIN code.",
    state: "Please choose your state.",
    agree: "Please accept the policies to continue.",
  };

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    errorBox.classList.remove("show");

    // Check every field in the browser first (the server checks again)
    var firstBad = null;
    form.querySelectorAll("input, select").forEach(function (el) {
      if (!el.checkValidity()) {
        el.classList.add("invalid");
        if (!firstBad) firstBad = el;
      }
    });
    if (firstBad) {
      showError(MESSAGES[firstBad.id] || "Please check the highlighted fields.", false);
      firstBad.scrollIntoView({ behavior: "smooth", block: "center" });
      firstBad.focus({ preventScroll: true });
      return;
    }

    payBtn.disabled = true;
    payBtn.textContent = "Starting secure payment...";

    var data = Object.fromEntries(new FormData(form).entries());
    data.quantity = Number(data.quantity);

    try {
      var res = await fetch("/api/createpayment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      var body = await res.json().catch(function () { return {}; });
      if (!res.ok || !body.redirectUrl) throw new Error(body.error || "Unable to start the payment. Please try again.");
      window.location.href = body.redirectUrl; // go to PhonePe
    } catch (err) {
      showError(err.message, true);
      payBtn.disabled = false;
      payBtn.textContent = "Pay securely with PhonePe";
    }
  });
})();
