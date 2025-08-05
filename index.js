require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { Client, LocalAuth } = require('whatsapp-web.js');

const app = express();
const PORT = process.env.PORT || 3000;
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Initialize WhatsApp clients
const adminBot = new Client({
  authStrategy: new LocalAuth({ clientId: "ADMIN_BOT" }),
  puppeteer: { args: ['--no-sandbox'] }
});

const userBot = new Client({
  authStrategy: new LocalAuth({ clientId: "USER_BOT" }),
  puppeteer: { args: ['--no-sandbox'] }
});

// Import handlers
const adminBotHandler = require('./bots/adminBot');
const userBotHandler = require('./bots/userBot');

// Initialize bots
adminBotHandler(adminBot, supabase);
userBotHandler(userBot, supabase);

// Routes
app.get('/', (req, res) => res.send('WhatsApp Form Bot Running'));
app.get('/form/:id', require('./routes/form')(supabase));

// Start server
app.listen(PORT, () => {
  adminBot.initialize();
  userBot.initialize();
  console.log(`Server running on port ${PORT}`);
});