import fetch from "node-fetch";

// set some important variables
const { CLIENT_ID, APP_SECRET } = process.env;
const base = "https://api-m.sandbox.paypal.com";

// call the create order method
export async function createOrder() {
  const purchaseAmount = "55"; // TODO: pull prices from a database
  const accessToken = await generateAccessToken();
  const url = `${base}/v2/checkout/orders`;
  const response = await fetch(url, {
    method: "post",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "USD",
            value: purchaseAmount,
          },
        },
      ],
    }),
  });
  const data = await response.json();
  console.log(
    "Data from paypal-api.js createOrder()-> v2/checkout/orders",
    data
  );
  return data;
}

// capture payment for an order
export async function capturePayment(orderId) {
  const accessToken = await generateAccessToken();
  const url = `${base}/v2/checkout/orders/${orderId}/capture`;
  const response = await fetch(url, {
    method: "post",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const data = await response.json();
  console.log(
    "Data from paypal-api.js capturePayment(orderId) intent is capture-> v2/checkout/orders/orderId/capture",
    data
  );
  return data;
}

// generate access token
export async function generateAccessToken() {
  const auth = Buffer.from(CLIENT_ID + ":" + APP_SECRET).toString("base64");
  const response = await fetch(`${base}/v1/oauth2/token`, {
    method: "post",
    body: "grant_type=client_credentials",
    headers: {
      Authorization: `Basic ${auth}`,
    },
  });
  const data = await response.json();
  //console.log("This is the access token from generateAccessToken which is a call to /v1/oath2/token: \n", data.access_token)
  return data.access_token;
}

// generate client token
export async function generateClientToken() {
  const accessToken = await generateAccessToken();
  const response = await fetch(`${base}/v1/identity/generate-token`, {
    method: "post",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Accept-Language": "en_US",
      "Content-Type": "application/json",
    },
  });
  const data = await response.json();
  //console.log("This is the client token from generateClientToken which is a call to /v1/identity/generate-token \n", data.client_token)
  return data.client_token;
}

export async function check3DS(orderId) {
  const accessToken = await generateAccessToken();
  const url = `${base}/v2/checkout/orders/${orderId}?fields=payment_source`;
  const response = await fetch(url, {
    method: "get",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const data = await response.json();
  console.log("This is the payment source: ", data);
  return data;
}

export async function verifyWebhook(headersObj, bodyObj) {
  const accessToken = await generateAccessToken();
  const url = `${base}/v1/notifications/verify-webhook-signature`;
  console.log("headers trans time: ", headersObj["paypal-transmission-time"]);
  console.log("headers trans sig: ", headersObj["paypal-transmission-sig"]);
  console.log("bodyObj: ", bodyObj);

  const response = await fetch(url, {
    method: "post",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: {
      auth_algo: headersObj["paypal-auth-algo"],
      cert_url: headersObj["paypal-cert-url"],
      transmission_id: headersObj["paypal-transmission-id"],
      transmission_sig: headersObj["paypal-transmission-sig"],
      transmission_time: headersObj["paypal-transmission-time"],
      webhook_id: bodyObj.id,
      webhook_event: bodyObj,
    },
  });
  const data = await response.json();
  console.log("verifyWebhook returned: ", data);
  return data;
}
