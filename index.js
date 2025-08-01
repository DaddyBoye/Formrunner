const express = require("express");
const fetch = require("node-fetch");
require("dotenv").config();

const app = express();
app.use(express.json());

app.get("/", (req, res) => res.send("FormRunner Webhook is live ✅"));

app.post("/webhook", async (req, res) => {
  const message = req.body.messages?.[0];
  if (!message) return res.sendStatus(200);

  const from = message.from;
  const text = message.text?.body?.trim().toLowerCase();

  console.log("Received:", text, "from:", from);

  if (text === "/newform") {
    await sendMessage(from, "📋 Let's create your new form! What's the title?");
  }

  res.sendStatus(200);
});

async function sendMessage(to, body) {
  await fetch("https://waba.360dialog.io/v1/messages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.DIALOG_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body },
    }),
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
