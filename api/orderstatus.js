// GET /api/orderstatus?orderId=VIRASAT_...
// Used by the success page. Asks PhonePe whether the order is paid; if it is,
// the order is copied to the "Orders" tab of the Google Sheet.
// Only returns what the success page needs (no name, phone or address).

import { ORDER_ID_PATTERN, checkAndRecord } from "./_lib.js";

export default async function handler(req, res) {
  const orderId = String(req.query.orderId || "");
  if (!ORDER_ID_PATTERN.test(orderId)) {
    return res.status(400).json({ error: "Invalid order ID" });
  }

  try {
    const summary = await checkAndRecord(orderId);
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ orderId, ...summary });
  } catch (err) {
    console.error("Order status failed", orderId, err.message, err.details || "");
    return res.status(502).json({ error: "Could not check the payment right now" });
  }
}
