import {
  StandardCheckoutClient,
  Env,
  MetaInfo,
  PrefillUserLoginDetails,
  CreateSdkOrderRequest
} from "@phonepe-pg/pg-sdk-node";

import { randomUUID } from "crypto";

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed"
    });
  }

  try {

    const {
      name,
      email,
      phone,
      quantity,
      reference
    } = req.body;

    // ₹300 per ticket
    const amount = Number(quantity) * 300 * 100; // paise

    const client = StandardCheckoutClient.getInstance(
      process.env.PHONEPE_CLIENT_ID,
      process.env.PHONEPE_CLIENT_SECRET,
      Number(process.env.PHONEPE_CLIENT_VERSION),
      Env.PRODUCTION
    );

    const merchantOrderId = randomUUID();

    const prefillUserLoginDetails =
      PrefillUserLoginDetails
        .builder()
        .phoneNumber(phone);

    const metaInfo = MetaInfo
      .builder()
      .udf1(name || "")
      .udf2(email || "")
      .udf3(reference || "")
      .build();

    const orderRequest =
      CreateSdkOrderRequest
        .StandardCheckoutBuilder()
        .merchantOrderId(merchantOrderId)
        .amount(amount)
        .prefillUserLoginDetails(prefillUserLoginDetails)
        .metaInfo(metaInfo)
        .redirectUrl("https://itihaasa.in/success.html")
        .expireAfter(3600)
        .message(`Yuddhakand Tickets x ${quantity}`)
        .build();

    const response = await client.pay(orderRequest);

    return res.status(200).json({
      success: true,
      merchantOrderId,
      redirectUrl: response.redirectUrl
    });

  } catch (err) {

    console.error(err);

    return res.status(500).json({
      success: false,
      error: err.message
    });

  }
}
