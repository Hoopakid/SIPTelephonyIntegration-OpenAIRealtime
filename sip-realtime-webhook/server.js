import express from "express";
import dotenv from "dotenv";
import openaiWebhook from "./src/webhooks/openaiWebhook.js";

dotenv.config();

const app = express();

app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "SIP Realtime Webhook Server",
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.post("/openai/webhook", openaiWebhook);

app.use((err, req, res, next) => {
  console.error("❌ Server error:", err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✅ Webhook server running");
  console.log(`📡 Port: ${PORT}`);
  console.log(`🌐 Webhook URL: http://localhost:${PORT}/openai/webhook`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
});
