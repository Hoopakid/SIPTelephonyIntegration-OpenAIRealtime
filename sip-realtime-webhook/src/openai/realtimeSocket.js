import WebSocket from "ws";
import { handleCreateLead } from "../tools/createLead.js";

export function setupRealtimeSocket(callId) {
  const ws = new WebSocket(`wss://api.openai.com/v1/realtime/calls/${callId}`, {
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
  });

  ws.on("open", () => {
    console.log("🔌 WebSocket connected to OpenAI Realtime API");
  });

  ws.on("message", async (msg) => {
    const event = JSON.parse(msg.toString());

    console.log("📨 Event received:", event.type);

    if (event.type === "response.function_call_arguments.done") {
      if (event.name === "create_lead") {
        try {
          const args = JSON.parse(event.arguments);
          console.log("🛠️ create_lead called with:", args);

          await handleCreateLead(args);

          ws.send(
            JSON.stringify({
              type: "conversation.item.create",
              item: {
                type: "function_call_output",
                call_id: event.call_id,
                output: JSON.stringify({
                  success: true,
                  message: "Lead created successfully",
                }),
              },
            }),
          );

          ws.send(
            JSON.stringify({
              type: "response.create",
            }),
          );
        } catch (error) {
          console.error("❌ Error handling create_lead:", error);

          ws.send(
            JSON.stringify({
              type: "conversation.item.create",
              item: {
                type: "function_call_output",
                call_id: event.call_id,
                output: JSON.stringify({
                  success: false,
                  error: error.message,
                }),
              },
            }),
          );
        }
      }
    }

    if (event.type === "error") {
      console.error("❌ OpenAI error:", event.error);
    }
  });

  ws.on("error", (error) => {
    console.error("❌ WebSocket error:", error);
  });

  ws.on("close", () => {
    console.log("🔌 WebSocket disconnected");
  });

  return ws;
}
