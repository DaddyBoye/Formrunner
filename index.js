require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

// Initialize
const app = express();
const PORT = process.env.PORT || 3000;
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// WhatsApp Clients
const adminBot = new Client({
  authStrategy: new LocalAuth({ clientId: "ADMIN_BOT" }),
  puppeteer: { args: ['--no-sandbox'] }
});

const userBot = new Client({
  authStrategy: new LocalAuth({ clientId: "USER_BOT" }),
  puppeteer: { args: ['--no-sandbox'] }
});

// Sessions
const formCreationSessions = {};
const userFormSessions = {};

// Admin Bot Events
adminBot.on('qr', qr => {
  console.log("ADMIN BOT QR - Scan to create forms:");
  qrcode.generate(qr, { small: true });
});

adminBot.on('ready', () => console.log('Admin Bot Ready!'));

adminBot.on('message', async msg => {
  const chatId = msg.from;
  const text = msg.body.trim();

  // Start form creation
  if (!formCreationSessions[chatId] && (text === 'START' || text === 'CREATE FORM')) {
    formCreationSessions[chatId] = { step: 'title', fields: [] };
    await msg.reply('📝 Let\'s create a form! Enter the TITLE:');
    return;
  }

  // Form creation steps
  const session = formCreationSessions[chatId];
  if (session) {
    if (session.step === 'title') {
      session.title = text;
      session.step = 'questions';
      await msg.reply('✅ Title set! Enter the FIRST QUESTION (or type DONE to finish):');
    } 
    else if (text === 'DONE') {
      const { data, error } = await supabase
        .from('forms')
        .insert([{ 
          admin_id: chatId, 
          title: session.title, 
          fields: session.fields 
        }])
        .select();

      if (error) {
        await msg.reply('❌ Error saving form!');
      } else {
        const formId = data[0].id;
        const formLink = `${process.env.BASE_URL}/form/${formId}`;
        const whatsappLink = `https://wa.me/${process.env.USER_BOT_NUMBER}?text=FILL_${formId}`;
        
        await msg.reply(`🎉 Form created!\n\nShare this link:\n${whatsappLink}\n\nOr web link:\n${formLink}`);
      }
      delete formCreationSessions[chatId];
    } 
    else {
      session.fields.push({ type: 'text', question: text });
      await msg.reply(`✅ Question added! Enter NEXT QUESTION or type DONE to finish:`);
    }
  }

  // View responses
  if (text === 'VIEW RESPONSES') {
    const { data: forms } = await supabase
      .from('forms')
      .select('id, title')
      .eq('admin_id', chatId);

    if (!forms?.length) {
      await msg.reply("You haven't created any forms yet.");
      return;
    }

    let reply = "📋 Your Forms:\n";
    forms.forEach(form => {
      reply += `- ${form.title} (ID: ${form.id})\n`;
    });
    reply += "\nReply with *FORM_ID* to view responses.";
    await msg.reply(reply);
  }

  // Handle form ID input for responses
  if (/^\d+$/.test(text) && !formCreationSessions[chatId]) {
    const formId = text;
    const { data: responses } = await supabase
      .from('responses')
      .select('*')
      .eq('form_id', formId);

    if (!responses?.length) {
      await msg.reply(`No responses found for Form ${formId}.`);
      return;
    }

    let reply = `📊 Responses (${responses.length}):\n\n`;
    responses.forEach((res, i) => {
      reply += `Response #${i + 1}:\n`;
      Object.entries(res.answers).forEach(([q, a]) => {
        reply += `  • ${q}: ${a}\n`;
      });
      reply += `  Submitted: ${new Date(res.created_at).toLocaleString()}\n\n`;
    });
    await msg.reply(reply);
  }
});

// User Bot Events
userBot.on('message', async msg => {
  const chatId = msg.from;
  const text = msg.body.trim();

  // Start form filling
  if (text.startsWith('FILL_')) {
    const formId = text.split('_')[1];
    const { data: form, error } = await supabase
      .from('forms')
      .select('*')
      .eq('id', formId)
      .single();

    if (error || !form) {
      await msg.reply('❌ Form not found!');
      return;
    }

    userFormSessions[chatId] = {
      formId,
      currentQuestion: 0,
      answers: {}
    };
    await msg.reply(`📋 ${form.title}\n\n${form.fields[0].question}`);
    return;
  }

  // Continue form filling
  const session = userFormSessions[chatId];
  if (session) {
    const { data: form } = await supabase
      .from('forms')
      .select('*')
      .eq('id', session.formId)
      .single();

    if (!form) {
      await msg.reply('❌ Form no longer exists!');
      delete userFormSessions[chatId];
      return;
    }

    // Save answer
    const currentQ = form.fields[session.currentQuestion].question;
    session.answers[currentQ] = text;
    session.currentQuestion++;

    // Next question or finish
    if (session.currentQuestion < form.fields.length) {
      await msg.reply(form.fields[session.currentQuestion].question);
    } else {
      await supabase
        .from('responses')
        .insert([{
          form_id: session.formId,
          user_id: chatId,
          answers: session.answers
        }]);
      await msg.reply('✅ Thank you for completing the form!');
      delete userFormSessions[chatId];
    }
  }
});

// Express Routes
app.get('/form/:id', async (req, res) => {
  const formId = req.params.id;
  const { data: form, error } = await supabase
    .from('forms')
    .select('*')
    .eq('id', formId)
    .single();

  if (error || !form) {
    return res.status(404).send('Form not found');
  }

  const whatsappLink = `https://wa.me/${process.env.USER_BOT_NUMBER}?text=FILL_${formId}`;
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${form.title}</title>
      <meta property="og:title" content="${form.title}">
      <meta property="og:description" content="Click to fill this form">
    </head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1>${form.title}</h1>
      <p>${form.fields.length} questions</p>
      <a href="${whatsappLink}" 
         style="display: inline-block; background: #25D366; color: white; 
                padding: 12px 24px; border-radius: 5px; text-decoration: none; 
                font-weight: bold; margin-top: 20px;">
        Open in WhatsApp
      </a>
      <script>
        // Auto-redirect mobile users
        if (/Android|iPhone|iPad/i.test(navigator.userAgent)) {
          window.location.href = "${whatsappLink}";
        }
      </script>
    </body>
    </html>
  `);
});

// Start
app.listen(PORT, () => {
  adminBot.initialize();
  userBot.initialize();
  console.log(`Server running on port ${PORT}`);
});