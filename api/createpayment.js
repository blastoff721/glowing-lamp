
import {
  StandardCheckoutClient,
  Env,
  CreateSdkOrderRequest,
  PrefillUserLoginDetails
} from "@phonepe-pg/pg-sdk-node";

import { randomUUID } from "crypto";

export default async function handler(req, res) {
  try {
    const {
      name,
      email,
      phone,
      quantity,
      amount
    } = req.body;

    const client = StandardCheckoutClient.getInstance(
      process.env.PHONEPE_CLIENT_ID,
      process.env.PHONEPE_CLIENT_SECRET,
      Number(process.env.PHONEPE_CLIENT_VERSION),
      Env.PRODUCTION
    );

    const merchantOrderId = randomUUID();

    const prefillUserLoginDetails =
      PrefillUserLoginDetails.builder()
        .phoneNumber(phone);

    const orderRequest =
      CreateSdkOrderRequest.StandardCheckoutBuilder()
        .merchantOrderId(merchantOrderId)
        .amount(Number(amount) * 100)
        .prefillUserLoginDetails(prefillUserLoginDetails)
        .redirectUrl("https://itihaasa.in/payment-success.html")
        .expireAfter(3600)
        .build();

    const response = await client.pay(orderRequest);

    return res.status(200).json({
      success: true,
      redirectUrl: response.redirectUrl,
      merchantOrderId
    });

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}
