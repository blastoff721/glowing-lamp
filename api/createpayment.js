import { StandardCheckoutClient, Env } from "@phonepe-pg/pg-sdk-node";

export default async function handler(req, res) {
  try {
    const client = StandardCheckoutClient.getInstance(
      process.env.PHONEPE_CLIENT_ID,
      process.env.PHONEPE_CLIENT_SECRET,
      Number(process.env.PHONEPE_CLIENT_VERSION),
      Env.SANDBOX
    );

    return res.status(200).json({
      success: true,
      clientCreated: !!client
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}
