import crypto from "crypto";
import { acceptCall } from "../openai/acceptCall.js";

export default async function openaiWebhook(req, res) {
  const signature = req.headers["openai-signature"];
  const secret = process.env.OPENAI_WEBHOOK_SECRET;

  if (!verifySignature(req.rawBody, signature, secret)) {
    return res.status(401).send("Invalid signature");
  }

  const event = req.body;

  if (event.type === "realtime.call.incoming") {
    try {
      await acceptCall(event.call_id);
    } catch (err) {
      console.error("Accept call failed:", err.message);
    }
  }

  res.sendStatus(200);
}

function verifySignature(payload, signature, secret) {
  if (!signature || !secret) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
