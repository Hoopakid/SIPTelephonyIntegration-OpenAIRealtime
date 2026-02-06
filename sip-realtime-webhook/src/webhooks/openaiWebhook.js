import crypto from "crypto";
import { acceptCall } from "../openai/acceptCall.js";

export default async function openaiWebhook(req, res) {
  try {
    const svixId = req.headers["webhook-id"];
    const svixTimestamp = req.headers["webhook-timestamp"];
    const svixSignature = req.headers["webhook-signature"];
    const secret = process.env.OPENAI_WEBHOOK_SECRET;

    console.log("🔍 Debug info:");
    console.log("- Webhook ID:", svixId);
    console.log("- Timestamp:", svixTimestamp);
    console.log("- Signature:", svixSignature);
    console.log("- Secret configured:", secret ? "Yes" : "No");
    console.log("- Body is Buffer:", Buffer.isBuffer(req.body));

    if (
      !verifySvixSignature(
        req.body,
        svixId,
        svixTimestamp,
        svixSignature,
        secret,
      )
    ) {
      console.error("❌ Invalid webhook signature");
      return res.status(401).send("Invalid signature");
    }

    console.log("✅ Signature verified successfully");

    const event = JSON.parse(req.body.toString("utf8"));

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

function verifySvixSignature(payload, msgId, msgTimestamp, signature, secret) {
  if (!msgId || !msgTimestamp || !signature || !secret) {
    console.error("⚠️ Missing required headers or secret");
    console.error("- msgId:", !!msgId);
    console.error("- msgTimestamp:", !!msgTimestamp);
    console.error("- signature:", !!signature);
    console.error("- secret:", !!secret);
    return false;
  }

  if (!Buffer.isBuffer(payload)) {
    console.error("⚠️ Payload is not a Buffer");
    return false;
  }

  try {
    const secretBytes = secret.startsWith("whsec_")
      ? Buffer.from(secret.slice(6), "base64")
      : Buffer.from(secret, "base64");

    const signedContent = `${msgId}.${msgTimestamp}.${payload.toString()}`;

    const expectedSignature = crypto
      .createHmac("sha256", secretBytes)
      .update(signedContent)
      .digest("base64");

    console.log("🔐 Signature verification:");
    console.log(
      "- Signed content preview:",
      signedContent.substring(0, 100) + "...",
    );
    console.log("- Expected signature:", `v1,${expectedSignature}`);
    console.log("- Received signature:", signature);

    const signatures = signature.split(" ");

    for (const sig of signatures) {
      const [version, signatureValue] = sig.split(",");

      if (version === "v1") {
        if (signatureValue === expectedSignature) {
          console.log("✅ Signature match found!");
          return true;
        }
      }
    }

    console.error("❌ No matching signature found");
    return false;
  } catch (err) {
    console.error("❌ Signature verification error:", err.message);
    console.error(err.stack);
    return false;
  }
}
