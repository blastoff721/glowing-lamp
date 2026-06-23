import axios from "axios";

export default async function handler(req, res) {
  try {
    const clientId = process.env.PHONEPE_CLIENT_ID;
    const clientSecret = process.env.PHONEPE_CLIENT_SECRET;
    const clientVersion = process.env.PHONEPE_CLIENT_VERSION;

    return res.status(200).json({
      clientIdExists: !!clientId,
      clientSecretExists: !!clientSecret,
      clientVersionExists: !!clientVersion,
      env: process.env.PHONEPE_ENV
    });

  } catch (err) {
    return res.status(500).json({
      error: err.message
    });
  }
}
