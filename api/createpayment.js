import {
  StandardCheckoutClient,
  Env,
  MetaInfo,
  CreateSdkOrderRequest
} from '@phonepe-pg/pg-sdk-node';
import { randomUUID } from 'crypto';

const clientId = process.env.PHONEPE_CLIENT_ID;
const clientSecret = process.env.PHONEPE_CLIENT_SECRET;
const clientVersion = Number(process.env.PHONEPE_CLIENT_VERSION);
const env = Env.PRODUCTION;

const client = StandardCheckoutClient.getInstance(clientId, clientSecret, clientVersion, env);

const merchantOrderId = randomUUID();
const amount = 100; // Amount in paise (100 = ₹1.00)

const metaInfo = MetaInfo.builder()
    .udf1("udf1")
    .udf2("udf2")
    .udf3("udf3")
    .build();

const orderRequest = CreateSdkOrderRequest.StandardCheckoutBuilder()
    .merchantOrderId(merchantOrderId)
    .amount(amount)
    .metaInfo(metaInfo)
    .redirectUrl("https://yourdomain.com/payment/callback")
    .expireAfter(3600)
    .message("Your payment description")
    .build();

client.pay(orderRequest).then((response) => {
    const checkoutPageUrl = response.redirectUrl;
    console.log("Redirect to:", checkoutPageUrl);
}).catch((err) => {
    console.error("PhonePe payment error:", err);
});
