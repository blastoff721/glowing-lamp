// Shared helpers for the payment API.
// Files in /api that start with "_" are NOT public URLs on Vercel; they are only
// imported by the real endpoints (createpayment.js, orderstatus.js, webhook.js).

import crypto from "node:crypto";

// ---------------------------------------------------------------------------
// PRODUCTS: the ONLY place prices live. The browser never decides the price.
// To change the price, change it here AND the PRICE line in assets/js/order.js
// (that one is only for display).
// ---------------------------------------------------------------------------
export const PRODUCTS = {
  "virasat-diwali-2026": {
    name: "Virasat Diwali Anka 2026",
    price: 349, // rupees per copy, Speed Post shipping included
    prefix: "VIRASAT", // order IDs look like VIRASAT_1730000000000_ab12cd
    maxQty: 10,
  },
};

export function productFromOrderId(orderId) {
  const prefix = String(orderId).split("_")[0];
  return Object.entries(PRODUCTS).find(([, p]) => p.prefix === prefix) || null;
}

// Order IDs we create: PREFIX_<timestamp>_<6 hex>. Anything else is rejected.
export const ORDER_ID_PATTERN = /^[A-Z]{2,20}_\d{13}_[a-f0-9]{6}$/;

export function newOrderId(prefix) {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
}

// ---------------------------------------------------------------------------
// PhonePe (Standard Checkout v2)
// Set PHONEPE_ENV=sandbox in Vercel to use PhonePe's test system; anything
// else (or not set) uses the live system.
// ---------------------------------------------------------------------------
function phonepeUrls() {
  if (process.env.PHONEPE_ENV === "sandbox") {
    const base = "https://api-preprod.phonepe.com/apis/pg-sandbox";
    return {
      token: `${base}/v1/oauth/token`,
      pay: `${base}/checkout/v2/pay`,
      status: (id) => `${base}/checkout/v2/order/${id}/status`,
    };
  }
  return {
    token: "https://api.phonepe.com/apis/identity-manager/v1/oauth/token",
    pay: "https://api.phonepe.com/apis/pg/checkout/v2/pay",
    status: (id) => `https://api.phonepe.com/apis/pg/checkout/v2/order/${id}/status`,
  };
}

async function readJson(response, what) {
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  if (!response.ok) {
    const err = new Error(`${what} failed (${response.status})`);
    err.details = data;
    throw err;
  }
  return data;
}

async function getAccessToken() {
  const body = new URLSearchParams({
    client_id: process.env.PHONEPE_CLIENT_ID || "",
    client_version: process.env.PHONEPE_CLIENT_VERSION || "",
    client_secret: process.env.PHONEPE_CLIENT_SECRET || "",
    grant_type: "client_credentials",
  });
  const res = await fetch(phonepeUrls().token, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await readJson(res, "PhonePe login");
  return data.access_token;
}

export async function createPhonePeOrder({ merchantOrderId, amountPaise, redirectUrl, metaInfo }) {
  const token = await getAccessToken();
  const res = await fetch(phonepeUrls().pay, {
    method: "POST",
    headers: { Authorization: `O-Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      merchantOrderId,
      amount: amountPaise,
      expireAfter: 1200, // 20 minutes to pay
      metaInfo,
      paymentFlow: {
        type: "PG_CHECKOUT",
        merchantUrls: { redirectUrl },
      },
    }),
  });
  return readJson(res, "PhonePe create order");
}

export async function getPhonePeStatus(merchantOrderId) {
  const token = await getAccessToken();
  const res = await fetch(phonepeUrls().status(merchantOrderId), {
    headers: {
      Authorization: `O-Bearer ${token}`,
      "Content-Type": "application/json",
      "X-MERCHANT-ID": process.env.PHONEPE_MERCHANT_ID || "",
    },
  });
  return readJson(res, "PhonePe order status");
}

// ---------------------------------------------------------------------------
// Google Sheet (via the Apps Script in docs/google-apps-script.gs)
// ---------------------------------------------------------------------------
export async function sendToSheet(action, order) {
  const url = process.env.SHEET_WEBHOOK_URL;
  const secret = process.env.SHEET_SECRET;
  if (!url || !secret) throw new Error("SHEET_WEBHOOK_URL / SHEET_SECRET are not set in Vercel");

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" }, // Apps Script reads raw text
    body: JSON.stringify({ secret, action, order }),
    redirect: "follow",
  });
  const data = await readJson(res, "Google Sheet");
  if (!data.ok) {
    const err = new Error(`Google Sheet refused: ${data.error || "unknown"}`);
    err.details = data;
    throw err;
  }
  return data;
}

// ---------------------------------------------------------------------------
// Check an order with PhonePe and, if it is paid, copy it to the "Orders" tab.
// Safe to call many times (success page refresh + webhook): the sheet script
// ignores an order that is already in "Orders".
// ---------------------------------------------------------------------------
export function summarise(status) {
  const attempts = status.paymentDetails || [];
  const paid = attempts.find((p) => p.state === "COMPLETED") || attempts[attempts.length - 1] || {};
  return {
    state: status.state || "UNKNOWN",
    amountRupees: typeof status.amount === "number" ? status.amount / 100 : null,
    transactionId: paid.transactionId || null,
    paymentMode: paid.paymentMode || null,
    quantity: Number(status.metaInfo?.udf4) || null,
  };
}

export async function checkAndRecord(merchantOrderId) {
  const status = await getPhonePeStatus(merchantOrderId);
  const summary = summarise(status);

  if (summary.state === "COMPLETED") {
    const entry = productFromOrderId(merchantOrderId);
    const product = entry ? entry[1] : null;
    const expected = product && summary.quantity ? product.price * summary.quantity : null;
    const meta = status.metaInfo || {};

    try {
      await sendToSheet("paid", {
        orderId: merchantOrderId,
        transactionId: summary.transactionId,
        amount: summary.amountRupees,
        quantity: summary.quantity,
        note: expected !== null && expected !== summary.amountRupees
          ? `CHECK: expected Rs ${expected}, PhonePe says Rs ${summary.amountRupees}`
          : "",
        // Backup copy of the buyer details stored with PhonePe, used only if
        // the "Pending" row is missing for some reason.
        backup: { name: meta.udf1, phone: meta.udf2, email: meta.udf3, address: meta.udf5 },
      });
    } catch (err) {
      // The buyer has paid; never show them an error because of the sheet.
      // The order can still be found in the PhonePe dashboard.
      console.error("Could not record paid order in sheet", merchantOrderId, err.message, err.details || "");
    }
  }
  return summary;
}
