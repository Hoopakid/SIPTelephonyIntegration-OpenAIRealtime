import crypto from "crypto";
import { acceptCall } from "../openai/acceptCall.js";

export default async function openaiWebhook(req, res) {
  try {
    const signature = req.headers["openai-signature"];
    const secret = process.env.OPENAI_WEBHOOK_SECRET;

    const rawBody = req.body;

    console.log("🔍 Debug info:");
    console.log("- Signature received:", signature ? "Yes" : "No");
    console.log("- Secret configured:", secret ? "Yes" : "No");
    console.log("- Raw body type:", typeof rawBody);
    console.log("- Raw body length:", rawBody?.length);

    if (!verifySignature(rawBody, signature, secret)) {
      console.error("❌ Invalid webhook signature");
      console.error("Received signature:", signature);
      console.error("Expected signature would be computed from body");
      return res.status(401).send("Invalid signature");
    }

    const event = JSON.parse(rawBody.toString("utf8"));

    console.log("📨 Webhook event received:", event.type);
    console.log("📋 Full event:", JSON.stringify(event, null, 2));

    if (event.type === "realtime.call.incoming") {
      try {
        const callerPhoneNumber =
          event.from || event.caller_number || "Unknown";
        console.log("📞 Incoming call from:", callerPhoneNumber);
        console.log("📞 Call ID:", event.call_id);

        await acceptCall(event.call_id, callerPhoneNumber);
        console.log("✅ Call accepted successfully");
      } catch (err) {
        console.error("❌ Accept call failed:", err.message);
        console.error("Stack trace:", err.stack);
        return res.status(200).json({
          received: true,
          error: "Failed to accept call",
        });
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error("❌ Webhook handler error:", error.message);
    console.error("Stack trace:", error.stack);
    res.status(500).json({ error: "Internal server error" });
  }
}

function verifySignature(payload, signature, secret) {
  if (!signature) {
    console.error("⚠️ No signature provided in headers");
    return false;
  }

  if (!secret) {
    console.error("⚠️ No webhook secret configured");
    return false;
  }

  if (!Buffer.isBuffer(payload)) {
    console.error("⚠️ Payload is not a Buffer:", typeof payload);
    return false;
  }

  try {
    const expected = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    console.log("🔐 Signature verification:");
    console.log("- Received:", signature);
    console.log("- Expected:", expected);
    console.log("- Match:", signature === expected);

    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expected, "hex"),
    );
  } catch (err) {
    console.error("❌ Signature comparison error:", err.message);
    return false;
  }
}
