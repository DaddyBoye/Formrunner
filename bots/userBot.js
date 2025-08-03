module.exports = (userBot, supabase, validateInput) => {
  const sessions = {};
  
  userBot.on('qr', qr => {
    console.log("USER BOT QR - Scan for form filling:");
    require('qrcode-terminal').generate(qr, { small: true });
  });

  userBot.on('ready', () => console.log('User Bot Ready!'));

  userBot.on('message', async msg => {
    const chatId = msg.from;
    const text = msg.body.trim();

    // Start form
    if (text.startsWith('FILL_')) {
      const formId = text.split('_')[1];
      const { data: form } = await supabase
        .from('forms')
        .select('*')
        .eq('id', formId)
        .single();

      if (!form) {
        return await msg.reply('❌ Form not found!');
      }

      sessions[chatId] = { formId, currentQuestion: 0, answers: {} };
      return await msg.reply(`📝 *${form.title}*\n\nPlease answer ${form.fields.length} questions.\n\n1. ${form.fields[0].question}`);
    }

    // Form filling
    const session = sessions[chatId];
    if (!session) return;

    const { data: form } = await supabase
      .from('forms')
      .select('*')
      .eq('id', session.formId)
      .single();

    // Validate input
    const currentField = form.fields[session.currentQuestion];
    const validationError = validateInput(text, currentField);
    if (validationError) {
      return await msg.reply(validationError);
    }

    // Save answer
    session.answers[currentField.question] = text;
    session.currentQuestion++;

    // Next question or finish
    if (session.currentQuestion < form.fields.length) {
      const progress = `(${session.currentQuestion + 1}/${form.fields.length})`;
      await msg.reply(`${progress} ${form.fields[session.currentQuestion].question}`);
    } else {
      await supabase.from('responses').insert([{
        form_id: session.formId,
        user_id: chatId,
        user_number: chatId.split('@')[0],
        answers: session.answers
      }]);
      await msg.reply('✅ Thank you for your responses!');
      delete sessions[chatId];
    }
  });
};