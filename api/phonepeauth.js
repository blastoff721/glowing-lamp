import axios from "axios";

export default async function handler(req, res) {
  try {
    const params = new URLSearchParams();

    params.append("client_id", process.env.PHONEPE_CLIENT_ID);
    params.append(
      "client_version",
      process.env.PHONEPE_CLIENT_VERSION
    );
    params.append(
      "client_secret",
      process.env.PHONEPE_CLIENT_SECRET
    );
    params.append("grant_type", "client_credentials");

    const response = await axios.post(
      "https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token",
      params,
      {
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded"
        }
      }
    );

    res.status(200).json(response.data);

  } catch (error) {
    console.error(error.response?.data || error);


res.status(500).json({
  error: error.response?.data || error.message
    });
  }
}
