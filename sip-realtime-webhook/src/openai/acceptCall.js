import fetch from "node-fetch";
import { sessionConfig } from "../config/sessionConfig.js";

export async function acceptCall(callId) {
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
    throw new Error(err);
  }
}
