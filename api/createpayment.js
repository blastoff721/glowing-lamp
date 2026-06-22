import {
  StandardCheckoutClient,
  Env,
  CreateSdkOrderRequest
} from "@phonepe-pg/pg-sdk-node";

import { randomUUID } from "crypto";

export default async function handler(req, res) {
  try {

    const client = StandardCheckoutClient.getInstance(
      process.env.PHONEPE_CLIENT_ID,
      process.env.PHONEPE_CLIENT_SECRET,
      Number(process.env.PHONEPE_CLIENT_VERSION),
      Env.PRODUCTION
    );

    const merchantOrderId = randomUUID();

    const request = CreateSdkOrderRequest
      .StandardCheckoutBuilder()
      .merchantOrderId(merchantOrderId)
      .amount(100)
      .disablePaymentRetry(true)
      .redirectUrl("https://itihaasa.in/success.html")
      .build();

    const response = await client.createSdkOrder(request);

    return res.status(200).json({
      success: true,
      token: response.token,
      merchantOrderId
    });

  } catch (err) {

    return res.status(500).json({
      success: false,
      error: err.message,
      stack: err.stack
    });

  }
}
