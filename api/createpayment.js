// POST /api/createpayment
// Called by the order form (virasat.html). Checks the details, works out the
// price ON THE SERVER, saves the order as "Pending" in the Google Sheet, then
// creates the PhonePe payment and returns the PhonePe page to send the buyer to.

import { PRODUCTS, newOrderId, createPhonePeOrder, sendToSheet } from "./_lib.js";

const INDIAN_STATES = new Set([
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar",
  "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa",
  "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka",
  "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
  "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
]);

// Trim, squash spaces/new lines, cut to a max length.
function clean(value, max) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function validate(body) {
  const o = {
    product: clean(body.product, 40),
    name: clean(body.name, 80),
    phone: clean(body.phone, 10),
    email: clean(body.email, 120).toLowerCase(),
    address1: clean(body.address1, 120),
    address2: clean(body.address2, 120),
    landmark: clean(body.landmark, 80),
    city: clean(body.city, 60),
    state: clean(body.state, 60),
    pincode: clean(body.pincode, 6),
    reference: clean(body.reference, 80),
    quantity: Number(body.quantity),
  };

  const product = PRODUCTS[o.product];
  const errors = [];
  if (!product) errors.push("Unknown product");
  if (o.name.length < 2) errors.push("Please enter your full name");
  if (!/^[6-9]\d{9}$/.test(o.phone)) errors.push("Please enter a valid 10-digit WhatsApp number");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(o.email)) errors.push("Please enter a valid email address");
  if (o.address1.length < 3) errors.push("Please enter your house / flat / building");
  if (o.address2.length < 3) errors.push("Please enter your street / area");
  if (o.city.length < 2) errors.push("Please enter your city or town");
  if (!INDIAN_STATES.has(o.state)) errors.push("Please choose your state");
  if (!/^[1-9]\d{5}$/.test(o.pincode)) errors.push("Please enter a valid 6-digit PIN code");
  if (product && (!Number.isInteger(o.quantity) || o.quantity < 1 || o.quantity > product.maxQty)) {
    errors.push(`You can order 1 to ${product.maxQty} copies at a time`);
  }
  return { order: o, product, errors };
}

// PhonePe's extra fields: keep them plain and short.
function metaSafe(value, max = 250) {
  return String(value).replace(/[^\p{L}\p{N} ,.\-/@#()]/gu, "").slice(0, max);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { order, product, errors } = validate(req.body || {});
  if (errors.length) return res.status(400).json({ error: errors.join(". ") });

  const amount = product.price * order.quantity; // rupees, decided here only
  const merchantOrderId = newOrderId(product.prefix);
  const siteUrl = process.env.SITE_URL || `https://${req.headers.host}`;
  const fullAddress = [order.address1, order.address2, order.landmark && `Landmark: ${order.landmark}`,
    order.city, order.state, order.pincode].filter(Boolean).join(", ");

  // 1) Save as Pending FIRST, so we never take money without having the address.
  try {
    await sendToSheet("pending", {
      orderId: merchantOrderId,
      product: product.name,
      quantity: order.quantity,
      amount,
      name: order.name,
      phone: order.phone,
      email: order.email,
      address1: order.address1,
      address2: order.address2,
      landmark: order.landmark,
      city: order.city,
      state: order.state,
      pincode: order.pincode,
      reference: order.reference,
    });
  } catch (err) {
    console.error("Sheet (pending) failed", err.message, err.details || "");
    return res.status(503).json({ error: "We could not start your order right now. Please try again in a minute." });
  }

  // 2) Create the PhonePe payment.
  try {
    const payment = await createPhonePeOrder({
      merchantOrderId,
      amountPaise: amount * 100,
      redirectUrl: `${siteUrl}/success?merchantOrderId=${merchantOrderId}`,
      metaInfo: {
        udf1: metaSafe(order.name),
        udf2: order.phone,
        udf3: metaSafe(order.email),
        udf4: String(order.quantity),
        udf5: metaSafe(fullAddress),
      },
    });

    if (!payment.redirectUrl) throw Object.assign(new Error("No redirectUrl from PhonePe"), { details: payment });
    return res.status(200).json({ redirectUrl: payment.redirectUrl, orderId: merchantOrderId });
  } catch (err) {
    console.error("PhonePe create failed", merchantOrderId, err.message, err.details || "");
    return res.status(502).json({ error: "Unable to start the payment. Please try again." });
  }
}
