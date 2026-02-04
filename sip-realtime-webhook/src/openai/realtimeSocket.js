import { handleCreateLead } from "../tools/createLead.js";

ws.on("message", async (msg) => {
  const event = JSON.parse(msg);

  if (event.type === "response.output_tool_call") {
    if (event.name === "create_lead") {
      await handleCreateLead(event.arguments);

      ws.send(
        JSON.stringify({
          type: "response.create",
          response: {
            instructions: "Rahmat. Ma’lumotlar saqlandi.",
          },
        }),
      );
    }
  }
});
