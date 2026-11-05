// POST /api/webhook  (optional, but recommended)
// PhonePe calls this by itself when a payment finishes, so a paid order reaches
// the sheet even if the buyer closes the browser before the success page loads.
//
// Set up in the PhonePe dashboard (Developer Settings -> Webhook):
//   URL:      https://www.itihaasa.in/api/webhook
//   Username / Password: any you choose; put the same two values in Vercel as
//   PHONEPE_WEBHOOK_USERNAME and PHONEPE_WEBHOOK_PASSWORD.
//   Events:   checkout.order.completed (and checkout.order.failed if offered)
//
// PhonePe signs each call with SHA256("username:password"). We check it, then
// ask PhonePe for the real status ourselves instead of trusting the message.

import crypto from "node:crypto";
import { ORDER_ID_PATTERN, checkAndRecord } from "./_lib.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const user = process.env.PHONEPE_WEBHOOK_USERNAME;
  const pass = process.env.PHONEPE_WEBHOOK_PASSWORD;
  if (!user || !pass) return res.status(503).json({ error: "Webhook not configured" });

  const expected = crypto.createHash("sha256").update(`${user}:${pass}`).digest("hex");
  const received = String(req.headers.authorization || "").replace(/^SHA256\s*/i, "").trim().toLowerCase();
  const ok = received.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected));
  if (!ok) return res.status(401).json({ error: "Unauthorised" });

  const payload = req.body?.payload || {};
  const orderId = payload.merchantOrderId || payload.originalMerchantOrderId || "";
  if (!ORDER_ID_PATTERN.test(orderId)) {
    // Not one of ours (for example an old ticket order). Acknowledge and ignore.
    return res.status(200).json({ ignored: true });
  }

  try {
    const summary = await checkAndRecord(orderId);
    return res.status(200).json({ received: true, state: summary.state });
  } catch (err) {
    console.error("Webhook check failed", orderId, err.message, err.details || "");
    return res.status(500).json({ error: "Retry later" }); // PhonePe will retry
  }
}
