const validateInput = require('../utils/validation');

// Intuitive command parser for user bot
class UserCommandParser {
  constructor() {
    // Command patterns that feel natural but are clearly commands
    this.commandPatterns = {
      // Slash commands (most intuitive for users familiar with Discord/Slack)
      slash: /^\/(\w+)(?:\s+(.*))?$/,
      
      // Dot commands (simple and clean)
      dot: /^\.(\w+)(?:\s+(.*))?$/,
      
      // Hash commands (like hashtags)
      hash: /^#(\w+)(?:\s+(.*))?$/,
      
      // Exclamation commands (feels like emphasis)
      exclamation: /^!(\w+)(?:\s+(.*))?$/,
      
      // Greater than commands (like terminal)
      arrow: /^>(\w+)(?:\s+(.*))?$/,
      
      // Colon commands (like IRC)
      colon: /^:(\w+)(?:\s+(.*))?$/,
      
      // Dash commands (like CLI flags)
      dash: /^-(\w+)(?:\s+(.*))?$/,
      
      // Double dash commands (like long CLI options)
      doubleDash: /^--(\w+)(?:\s+(.*))?$/
    };

    // Command mappings with aliases
    this.commands = {
      // Form starting
      'start': 'startForm',
      'begin': 'startForm',
      'form': 'startForm',
      'fill': 'startForm',
      'open': 'startForm',
      
      // Navigation commands
      'back': 'previousQuestion',
      'prev': 'previousQuestion',
      'previous': 'previousQuestion',
      'undo': 'previousQuestion',
      
      'next': 'nextQuestion',
      'skip': 'skipQuestion',
      
      // Review commands
      'review': 'reviewAnswers',
      'check': 'reviewAnswers',
      'summary': 'reviewAnswers',
      'answers': 'reviewAnswers',
      
      // Completion commands
      'submit': 'submitForm',
      'finish': 'submitForm',
      'done': 'submitForm',
      'send': 'submitForm',
      'complete': 'submitForm',
      
      // Progress commands
      'progress': 'showProgress',
      'status': 'showProgress',
      'where': 'showProgress',
      
      // Cancel/restart commands
      'cancel': 'cancelForm',
      'quit': 'cancelForm',
      'exit': 'cancelForm',
      'stop': 'cancelForm',
      'restart': 'restartForm',
      'reset': 'restartForm',
      
      // Help commands
      'help': 'help',
      '?': 'help',
      'commands': 'help',
      'info': 'help'
    };
  }

  parseCommand(text) {
    const trimmed = text.trim();
    
    // Try each command pattern
    for (const [patternName, pattern] of Object.entries(this.commandPatterns)) {
      const match = trimmed.match(pattern);
      if (match) {
        const [, command, args] = match;
        const mappedCommand = this.commands[command.toLowerCase()];
        
        if (mappedCommand) {
          return {
            original: trimmed,
            pattern: patternName,
            command: mappedCommand,
            rawCommand: command.toLowerCase(),
            args: args ? args.trim() : '',
            isCommand: true
          };
        }
      }
    }
    
    return { isCommand: false, original: trimmed };
  }

  getHelpText() {
    return `🤖 **Form Filling Commands**

**Start Forms:**
\`start [formId]\` \`form [formId]\` \`fill [formId]\`

**Navigate:**
\`back\` \`prev\` - Go to previous question
\`next\` \`skip\` - Skip current question (if allowed)

**Review:**
\`review\` \`answers\` - See your current answers
\`progress\` \`status\` - Check progress

**Complete:**
\`submit\` \`done\` \`finish\` - Submit form

**Control:**
\`cancel\` \`quit\` - Cancel form
\`restart\` \`reset\` - Start over
\`help\` \`?\` - Show this help

**Patterns:** Use any prefix: \`/\`, \`.\`, \`#\`, \`!\`, \`>\`, \`:\`, \`-\`, \`--\``;
  }
}

module.exports = (userBot, supabase) => {
  const sessions = {};
  const commandParser = new UserCommandParser();
  
  userBot.on('qr', qr => {
    console.log("USER BOT QR - Scan for form filling:");
    require('qrcode-terminal').generate(qr, { small: true });
  });

  userBot.on('ready', () => console.log('User Bot Ready!'));

  userBot.on('message', async msg => {
    if (!msg.body || msg.body.trim() === '') {
        return; // Ignore empty messages
    }
    if (msg.from === 'status@broadcast' || 
        msg.type === 'protocol' || 
        msg.isGroupMsg) {
        return;
    }
    const chatId = msg.from;
    const text = msg.body.trim();
    const session = sessions[chatId];

    // Parse for commands
    const parsed = commandParser.parseCommand(text);

    // Handle legacy START_ format for backwards compatibility
    if (text.startsWith('START_')) {
      const formId = text.split('_')[1];
      await startForm(msg, chatId, formId);
      return;
    }

    // Handle commands
    if (parsed.isCommand) {
      await handleCommand(msg, chatId, parsed, session);
      return;
    }

    // Handle regular form filling flow
    if (session) {
      await handleFormInput(msg, chatId, text, session);
    }
    // If no session and no command, do nothing (normal conversation)
  });

  async function handleCommand(msg, chatId, parsed, session) {
    const { command, args } = parsed;

    switch (command) {
      case 'startForm':
        if (args) {
          await startForm(msg, chatId, args);
        } else {
          await msg.reply(`📋 **Start Form**\n\nPlease provide form ID:\n\`${getExampleCommand(parsed.pattern)}start 123\`\n\nOr click a form link to start automatically.`);
        }
        break;

      case 'previousQuestion':
        if (!session) {
          await msg.reply(`⚠️ **Not in Form**\n\nStart a form first with \`${getExampleCommand(parsed.pattern)}start [formId]\``);
          return;
        }
        await goToPreviousQuestion(msg, session);
        break;

      case 'nextQuestion':
        if (!session) {
          await msg.reply(`⚠️ **Not in Form**\n\nStart a form first with \`${getExampleCommand(parsed.pattern)}start [formId]\``);
          return;
        }
        await goToNextQuestion(msg, session);
        break;

      case 'skipQuestion':
        if (!session) {
          await msg.reply(`⚠️ **Not in Form**\n\nStart a form first with \`${getExampleCommand(parsed.pattern)}start [formId]\``);
          return;
        }
        await skipCurrentQuestion(msg, session);
        break;

      case 'reviewAnswers':
        if (!session) {
          await msg.reply(`⚠️ **Not in Form**\n\nStart a form first with \`${getExampleCommand(parsed.pattern)}start [formId]\``);
          return;
        }
        await showReviewAnswers(msg, session);
        break;

      case 'submitForm':
        if (!session) {
          await msg.reply(`⚠️ **Not in Form**\n\nStart a form first with \`${getExampleCommand(parsed.pattern)}start [formId]\``);
          return;
        }
        await submitForm(msg, chatId, session);
        break;

      case 'showProgress':
        if (!session) {
          await msg.reply(`⚠️ **Not in Form**\n\nStart a form first with \`${getExampleCommand(parsed.pattern)}start [formId]\``);
          return;
        }
        await showProgress(msg, session);
        break;

      case 'cancelForm':
        if (session) {
          delete sessions[chatId];
          await msg.reply(`❌ **Form Cancelled**\n\nYour progress has been discarded.`);
        } else {
          await msg.reply(`ℹ️ **Nothing to Cancel**\n\nYou're not currently filling a form.`);
        }
        break;

      case 'restartForm':
        if (session) {
          const formId = session.formId;
          delete sessions[chatId];
          await startForm(msg, chatId, formId);
        } else {
          await msg.reply(`⚠️ **Not in Form**\n\nStart a form first with \`${getExampleCommand(parsed.pattern)}start [formId]\``);
        }
        break;

      case 'help':
        await msg.reply(commandParser.getHelpText());
        break;

      default:
        await msg.reply(`❓ **Unknown Command**\n\nUse \`${getExampleCommand(parsed.pattern)}help\` for available commands.`);
    }
  }

  async function startForm(msg, chatId, formId) {
    try {
      const { data: form } = await supabase
        .from('forms')
        .select('*')
        .eq('id', formId)
        .single();

      if (!form) {
        await msg.reply(`❌ **Form Not Found**\n\nForm ID "${formId}" doesn't exist or has been deleted.`);
        return;
      }

      // Clear any existing session
      if (sessions[chatId]) {
        delete sessions[chatId];
      }

      sessions[chatId] = {
        formId,
        currentQuestion: 0,
        answers: {},
        formTitle: form.title,
        fields: form.fields,
        fieldCount: form.fields.length,
        startTime: new Date()
      };

      await msg.reply(`📋 **Starting Form:** ${form.title}\n\n**Questions:** ${form.fields.length}\n**Estimated time:** ${Math.ceil(form.fields.length * 0.5)} minutes\n\n💡 **Tip:** Use \`/help\` anytime for commands`);
      
      await showQuestion(msg, sessions[chatId]);
    } catch (error) {
      await msg.reply(`❌ **Error:** ${error.message}`);
    }
  }

  async function handleFormInput(msg, chatId, text, session) {
      // Check if form is already complete
      if (session.currentQuestion >= session.fieldCount) {
          await msg.reply("ℹ️ You've already completed this form. Use /review to see your answers or /submit to submit.");
          return;
      }

      // Rest of your existing validation...
      const currentField = session.fields[session.currentQuestion];
      const error = validateInput(text, currentField);
      
      if (error) {
        await showError(msg, error, currentField);
        return;
      }

      // Save answer
      session.answers[currentField.question] = text;
      session.currentQuestion++;

      // Next question or finish
      if (session.currentQuestion < session.fieldCount) {
          await showQuestion(msg, session);
      } else {
          // Reset currentQuestion to last question index to prevent out of bounds
          session.currentQuestion = session.fieldCount - 1;
          await showCompletionSummary(msg, session);
      }
  }

  async function showQuestion(msg, session) {
    const field = session.fields[session.currentQuestion];
    const progress = `${session.currentQuestion + 1}/${session.fieldCount}`;
    const progressBar = generateProgressBar(session.currentQuestion, session.fieldCount);
    
    let prompt = `📋 **${session.formTitle}**\n\n${progressBar} (${progress})\n\n**${field.question}**`;
    
    // Add input hints based on field type
    switch (field.type) {
      case 'rating':
        prompt += '\n\n📊 _Reply with a number from 1-5_';
        break;
      case 'email':
        prompt += '\n\n✉️ _Enter a valid email address_';
        break;
      case 'phone':
        prompt += '\n\n📞 _Enter your phone number_';
        break;
      case 'number':
        prompt += '\n\n🔢 _Enter numbers only_';
        break;
      case 'yesno':
        prompt += '\n\n✅ _Reply with Yes or No_';
        break;
    }

    // Add navigation hints
    if (session.currentQuestion > 0) {
      prompt += '\n\n💡 _Use `/back` to go to previous question_';
    }
    
    await msg.reply(prompt);
  }

  async function goToPreviousQuestion(msg, session) {
    if (session.currentQuestion === 0) {
      await msg.reply(`⚠️ **Already at First Question**\n\nYou're at the beginning of the form.`);
      return;
    }

    session.currentQuestion--;
    await msg.reply(`⬅️ **Going Back**\n\nReturning to previous question...`);
    await showQuestion(msg, session);
  }

  async function goToNextQuestion(msg, session) {
    if (session.currentQuestion >= session.fieldCount - 1) {
      await msg.reply(`⚠️ **Already at Last Question**\n\nUse \`/submit\` to complete the form.`);
      return;
    }

    // Mark current as skipped if no answer
    const currentField = session.fields[session.currentQuestion];
    if (!session.answers[currentField.question]) {
      session.answers[currentField.question] = '[SKIPPED]';
    }

    session.currentQuestion++;
    await msg.reply(`⏭️ **Skipped**\n\nMoving to next question...`);
    await showQuestion(msg, session);
  }

  async function skipCurrentQuestion(msg, session) {
    await goToNextQuestion(msg, session);
  }

  async function showReviewAnswers(msg, session) {
      let review = `📝 **Review Your Answers**\n\n**Form:** ${session.formTitle}\n\n`;
      
      session.fields.forEach((field, index) => {
          const answer = session.answers[field.question] || '[Not answered]';
          const status = session.answers[field.question] ? '✅' : '⭕';
          review += `${status} **Q${index + 1}:** ${field.question}\n   **A:** ${answer}\n\n`;
      });

      const answeredCount = Object.keys(session.answers).filter(key => 
          session.answers[key] && session.answers[key] !== '[SKIPPED]'
      ).length;

      review += `**Progress:** ${answeredCount}/${session.fieldCount} answered`;
      
      if (session.currentQuestion >= session.fieldCount) {
          review += "\n\n✅ **Form Complete!** Ready to /submit";
      }
      
      await msg.reply(review);
  }

  async function showProgress(msg, session) {
    const answeredCount = Object.keys(session.answers).filter(key => 
      session.answers[key] && session.answers[key] !== '[SKIPPED]'
    ).length;
    
    const progressBar = generateProgressBar(session.currentQuestion, session.fieldCount);
    const percentage = Math.round((session.currentQuestion / session.fieldCount) * 100);
    
    await msg.reply(`📊 **Progress Report**\n\n${progressBar}\n\n**Current:** Question ${session.currentQuestion + 1} of ${session.fieldCount}\n**Completed:** ${percentage}%\n**Answered:** ${answeredCount}/${session.fieldCount}\n**Form:** ${session.formTitle}`);
  }

  async function showCompletionSummary(msg, session) {
      const answeredCount = Object.keys(session.answers).filter(key => 
          session.answers[key] && session.answers[key] !== '[SKIPPED]'
      ).length;

      await msg.reply(`🎉 **Form Complete!**\n\n**${session.formTitle}**\n\n✅ **Answered:** ${answeredCount}/${session.fieldCount} questions\n⏱️ **Time taken:** ${getTimeDifference(session.startTime)}\n\n**What would you like to do?**\n• \`/review\` - Review your answers\n• \`/submit\` - Submit the form\n• \`/restart\` - Start over`);
  }

  async function submitForm(msg, chatId, session) {
    const answeredCount = Object.keys(session.answers).filter(key => 
      session.answers[key] && session.answers[key] !== '[SKIPPED]'
    ).length;

    if (answeredCount === 0) {
      await msg.reply(`⚠️ **Cannot Submit**\n\nYou haven't answered any questions yet.`);
      return;
    }

    try {
      await supabase.from('responses').insert([{
        form_id: session.formId,
        user_id: chatId,
        user_number: chatId.split('@')[0],
        answers: session.answers,
        submitted_at: new Date(),
        completion_time: getTimeDifference(session.startTime)
      }]);
      
      await msg.reply(`✅ **Form Submitted Successfully!**\n\n**Form:** ${session.formTitle}\n**Answered:** ${answeredCount}/${session.fieldCount} questions\n**Time:** ${getTimeDifference(session.startTime)}\n\nThank you for your responses! 🙏`);
      
      delete sessions[chatId];
    } catch (error) {
      await msg.reply(`❌ **Submission Failed**\n\nError: ${error.message}\n\nPlease try again with \`/submit\``);
    }
  }

  async function showError(msg, error, field) {
    let examples = '';
    let helpText = '';
    
    switch (field.type) {
      case 'email':
        examples = '\n\n**Example:** user@example.com';
        break;
      case 'phone':
        examples = '\n\n**Example:** +1234567890 or 1234567890';
        break;
      case 'rating':
        examples = '\n\n**Valid:** 1, 2, 3, 4, or 5';
        break;
      case 'number':
        examples = '\n\n**Example:** 25, 100, 1500';
        break;
    }
    
    helpText = '\n\n💡 _Use `/back` to go to previous question or `/skip` to skip this one_';
    
    await msg.reply(`❌ **Invalid Input**\n\n${error}${examples}${helpText}`);
  }

  function generateProgressBar(current, total, length = 10) {
    const filled = Math.round((current / total) * length);
    const empty = length - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }

  function getTimeDifference(startTime) {
    const diff = new Date() - startTime;
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  }

  function getExampleCommand(pattern) {
    const prefixes = {
      slash: '/',
      dot: '.',
      hash: '#',
      exclamation: '!',
      arrow: '>',
      colon: ':',
      dash: '-',
      doubleDash: '--'
    };
    return prefixes[pattern] || '/';
  }
};