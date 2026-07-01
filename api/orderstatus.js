import axios from "axios";

export default async function handler(req, res) {
  try {
    // Read orderId from URL
    const { orderId } = req.query;

    if (!orderId) {
      return res.status(400).json({
        error: "orderId is required"
      });
    }

    // STEP 1: Generate OAuth token
    const params = new URLSearchParams();

    params.append(
      "client_id",
      process.env.PHONEPE_CLIENT_ID
    );

    params.append(
      "client_version",
      process.env.PHONEPE_CLIENT_VERSION
    );

    params.append(
      "client_secret",
      process.env.PHONEPE_CLIENT_SECRET
    );

    params.append(
      "grant_type",
      "client_credentials"
    );

    const authResponse = await axios.post(
      "https://api.phonepe.com/apis/identity-manager/v1/oauth/token",
      params,
      {
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded"
        }
      }
    );

    const accessToken =
      authResponse.data.access_token;

    // STEP 2: Ask PhonePe for order status
    const statusResponse = await axios.get(
      `https://api.phonepe.com/apis/pg/checkout/v2/order/${orderId}/status`,
      {
        headers: {
          Authorization:
            `O-Bearer ${accessToken}`,

          "Content-Type":
            "application/json",

          "X-MERCHANT-ID":
            process.env.PHONEPE_MERCHANT_ID
        }
      }
    );

    // Return response to frontend
    res.status(200).json(
      statusResponse.data
    );

  } catch (error) {
    console.error(
      error.response?.data ||
      error.message
    );

    res.status(500).json({
      error:
        error.response?.data ||
        error.message
    });
  }
}
