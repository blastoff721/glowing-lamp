import { StandardCheckoutClient, Env } from "@phonepe-pg/pg-sdk-node";

export default async function handler(req, res) {
  return res.status(200).json({
    success: true,
    sdkLoaded: true,
    env: Env.SANDBOX ? "sandbox_available" : "unknown"
  });
}
