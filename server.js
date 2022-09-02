import "dotenv/config";
import express from "express";
import * as paypal from "./paypal-api.js";

const app = express();
app.set("view engine", "ejs"); //set up ejs for templating
app.use(express.static("public")); // serve static files from public - app.js

const PORT = process.env.PORT || 3030;

// render checkout page with client id & unique client token
app.get("/", async (req, res) => {
  const clientId = process.env.CLIENT_ID;
  //console.log("clientId from env variable", clientId)
  const clientToken = await paypal.generateClientToken(); //this is in paypal-api.js. First there is a call to /v1/oath2/token and then another one to /v1/identity/generate-token
  //console.log("This is the clientToken from server.js which is generated from generateClientToken(): \n", clientToken)
  res.render("checkout", { clientId, clientToken }); //renders checkout.ejs from views
});

// create order
app.post("/api/orders", async (req, res) => {
  const order = await paypal.createOrder(); //createOrder is in paypal-api.js - call to  "https://api-m.sandbox.paypal.com/v2/checkout/orders";
  res.json(order);
});

// capture payment
app.post("/api/orders/:orderID/capture", async (req, res) => {
  const { orderID } = req.params;
  const captureData = await paypal.capturePayment(orderID); //capturePayment is on paypal-api.js - call to https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderId}/capture;
  res.json(captureData);
});

app.get("/api/orders/:orderID", async (req, res) => {
  const { orderID } = req.params;
  const paymentSource = await paypal.check3DS(orderID);
  res.json(paymentSource);
});

app.get("/webhooks", async (req, res) => {
  const response = req.params;
  console.log("This is what the webhooks endpoint got hit with: ", response);
  res.json(response);
});

app.listen(PORT, () => {
  console.log(`server started on port ${PORT}`);
});
