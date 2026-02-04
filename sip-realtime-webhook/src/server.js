import express from "express";
import dotenv from "dotenv";
import openaiWebhook from "./webhooks/openaiWebhook.js";

dotenv.config();

const app = express();

app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    }
  })
);

app.post("/openai/webhook", openaiWebhook);

app.listen(process.env.PORT, () => {
  console.log(`Webhook server running on port ${process.env.PORT}`);
});
