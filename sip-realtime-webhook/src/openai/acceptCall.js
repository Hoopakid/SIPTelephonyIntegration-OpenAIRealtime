import fetch from "node-fetch";
import { createSessionConfig } from "../config/sessionConfig.js";

export async function acceptCall(callId, callerPhoneNumber) {
  const sessionConfig = createSessionConfig(callerPhoneNumber);

  console.log("🔧 Session config created for:", callerPhoneNumber);

  const res = await fetch(
    `https://api.openai.com/v1/realtime/calls/${callId}/accept`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ session: sessionConfig }),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    console.error("❌ OpenAI API error:", err);
    throw new Error(`Failed to accept call: ${err}`);
  }

  const responseData = await res.json();
  console.log("✅ Call accepted, session started:", responseData);

  return responseData;
}
