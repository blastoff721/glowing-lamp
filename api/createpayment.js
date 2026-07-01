import axios from "axios";

export default async function handler(req, res) {
  try {
    // Customer details from checkout form
    const {
      name,
      email,
      phone,
      quantity,
      amount,
      reference
    } = req.body;

    // Generate unique order ID
    const merchantOrderId = `YUDDHA_${Date.now()}`;

    // Step 1: Generate OAuth token
    const params = new URLSearchParams();

    params.append("client_id", process.env.PHONEPE_CLIENT_ID);
    params.append("client_version", process.env.PHONEPE_CLIENT_VERSION);
    params.append("client_secret", process.env.PHONEPE_CLIENT_SECRET);
    params.append("grant_type", "client_credentials");

    const authResponse = await axios.post(
      "https://api.phonepe.com/apis/identity-manager/v1/oauth/token",
      params,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      }
    );

    const accessToken = authResponse.data.access_token;

    // Step 2: Create PhonePe order
    const orderPayload = {
      merchantOrderId,
      amount: Number(amount) * 100, // convert ₹ to paise
      expireAfter: 1200,

      paymentFlow: {
        type: "PG_CHECKOUT",

        merchantUrls: {
          redirectUrl:
            "https://www.itihaasa.in/success.html?merchantOrderId=${merchantOrderId}"
        },

        disablePaymentRetry: false,
      },



      metaInfo: {
        udf1: name,
        udf2: phone,
        udf3: email,
        udf4: String(quantity),
        udf5: reference || ""
      }
    };

    const orderResponse = await axios.post(
      `https://api.phonepe.com/apis/pg/checkout/v2/pay`,
      orderPayload,
      {
        headers: {
          Authorization: `O-Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      }
    );

    res.status(200).json(orderResponse.data);

  } catch (error) {
    console.error(
      error.response?.data || error.message
    );

    res.status(500).json({
      error:
        error.response?.data ||
        error.message
    });
  }
}
