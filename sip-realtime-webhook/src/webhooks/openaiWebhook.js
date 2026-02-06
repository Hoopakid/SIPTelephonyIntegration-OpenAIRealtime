import crypto from "crypto";
import { acceptCall } from "../openai/acceptCall.js";

export default async function openaiWebhook(req, res) {
  try {
    console.log("=== INCOMING REQUEST ===");
    console.log("All headers:", JSON.stringify(req.headers, null, 2));
    console.log("Body type:", typeof req.body);
    console.log("Is Buffer?:", Buffer.isBuffer(req.body));
    console.log("Body:", req.body);

    const signature = req.headers["openai-signature"];
    const secret = process.env.OPENAI_WEBHOOK_SECRET;
    const rawBody = req.body;

    console.log("🔍 Debug info:");
    console.log("- Signature received:", signature ? "Yes" : "No");
    console.log("- Actual signature value:", signature);
    console.log("- Secret configured:", secret ? "Yes" : "No");
    console.log(
      "- Secret preview:",
      secret ? secret.substring(0, 10) + "..." : "None",
    );
    console.log("- Raw body type:", typeof rawBody);
    console.log("- Is Buffer:", Buffer.isBuffer(rawBody));

    if (!Buffer.isBuffer(rawBody)) {
      console.error("❌ Body is not a buffer! Cannot verify signature.");
      console.error("Body content:", rawBody);
      return res.status(500).json({ error: "Body parsing error" });
    }

    if (!verifySignature(rawBody, signature, secret)) {
      console.error("❌ Invalid webhook signature");
      return res.status(401).send("Invalid signature");
    }

    const event = JSON.parse(rawBody.toString("utf8"));

    console.log("📨 Webhook event received:", event.type);

    if (event.type === "realtime.call.incoming") {
      try {
        const callerPhoneNumber =
          event.from || event.caller_number || "Unknown";
        console.log("📞 Incoming call from:", callerPhoneNumber);

        await acceptCall(event.call_id, callerPhoneNumber);
        console.log("✅ Call accepted successfully");
      } catch (err) {
        console.error("❌ Accept call failed:", err.message);
        console.error(err.stack);
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error("❌ Webhook handler error:", error.message);
    console.error(error.stack);
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
