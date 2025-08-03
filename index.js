require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { Client, LocalAuth } = require('whatsapp-web.js');
const adminBotHandler = require('./bots/adminBot');
const userBotHandler = require('./bots/userBot');
const { validateInput } = require('./utils/validation');
const { generateCSV } = require('./utils/export');

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

// Inject dependencies
adminBotHandler(adminBot, supabase, validateInput, generateCSV);
userBotHandler(userBot, supabase, validateInput);

// Routes
app.get('/', (req, res) => res.sendFile(__dirname + '/public/index.html'));
app.get('/form/:id', require('./routes/form')(supabase));

// Start
app.listen(PORT, () => {
  adminBot.initialize();
  userBot.initialize();
  console.log(`Server running on port ${PORT}`);
});