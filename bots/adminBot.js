module.exports = (adminBot, supabase, validateInput, generateCSV) => {
  const sessions = {};
  
  adminBot.on('qr', qr => {
    console.log("ADMIN BOT QR - Scan to create forms:");
    require('qrcode-terminal').generate(qr, { small: true });
  });

  adminBot.on('ready', () => console.log('Admin Bot Ready!'));

  adminBot.on('message', async msg => {
    const chatId = msg.from;
    const text = msg.body.trim();

    // Start form creation
    if (!sessions[chatId] && text === 'START') {
      sessions[chatId] = { step: 'title', fields: [] };
      await msg.reply(`📋 *Form Builder* \n\nLet's create a form!\n1. Send the *title*\n2. Add questions\n3. Type *DONE* when finished`);
      return;
    }

    const session = sessions[chatId];
    if (!session) return;

    // Form creation steps
    if (session.step === 'title') {
      session.title = text;
      session.step = 'questions';
      await msg.reply(`✅ *Title set!*\n\nNow send your first question:`);
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
        const whatsappLink = `https://wa.me/${process.env.USER_BOT_NUMBER}?text=FILL_${formId}`;
        await msg.reply(`🎉 *Form Created!*\n\n🔗 Share this link:\n${whatsappLink}\n\n📊 To export responses:\n"EXPORT ${formId}"`);
      }
      delete sessions[chatId];
    } 
    else {
      session.fields.push({ 
        type: text.includes('(1-5)') ? 'rating' : 'text',
        question: text 
      });
      await msg.reply(`✅ Added! Next question or type *DONE*`);
    }
  });
};