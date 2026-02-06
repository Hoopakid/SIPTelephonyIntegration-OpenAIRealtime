import fetch from "node-fetch";

let cachedToken = null;
let tokenExpiresAt = 0;

async function getCrmToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const body = new URLSearchParams({
    grant_type: "password",
    username: process.env.CRM_USERNAME,
    password: process.env.CRM_PASSWORD,
    client_id: process.env.CRM_CLIENT_ID,
    client_secret: process.env.CRM_CLIENT_SECRET,
    scope: "",
  });

  const res = await fetch(process.env.CRM_AUTH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      accept: "application/json",
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`CRM auth failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in || 3600) * 1000;

  return cachedToken;
}

export async function handleCreateLead(data) {
  console.log("📞 New lead received from AI:", data);

  if (!data.phoneNumber) {
    console.warn("❗ Lead skipped: missing phone number");
    return;
  }

  const token = await getCrmToken();

  const notes = `Lead from AI operator | Job: ${
    data.businessField || "Not specified"
  } | Experience: ${
    data.experienceYears || "Not specified"
  } | Preferred call time: ${data.preferredCallTime || "Not specified"}`;

  const payload = {
    assistant_name: "AI Assistant",
    conversation_language: "uz",
    full_name: data.clientName || "Unknown",
    phone_number: data.phoneNumber,
    notes,
    platform: "AI operator",
    status: "need_to_call",
    username: data.clientName || "AI_Lead",
  };

  console.log("📤 Sending to CRM:", payload);

  const res = await fetch(process.env.CRM_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`CRM lead creation failed: ${res.status} ${text}`);
  }

  const result = await res.json();
  console.log("✅ CRM lead created:", result);

  return result;
}
