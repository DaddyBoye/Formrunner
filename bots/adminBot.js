const { generateCSV } = require('../utils/export');

// Intuitive command parser
class IntuitiveCommandParser {
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
      // Form creation
      'new': 'createForm',
      'create': 'createForm',
      'form': 'createForm',
      'start': 'createForm',
      'begin': 'createForm',
      
      // Export commands
      'export': 'exportData',
      'download': 'exportData',
      'csv': 'exportData',
      'data': 'exportData',
      'get': 'exportData',
      
      // View commands
      'view': 'viewForm',
      'show': 'viewForm',
      'see': 'viewForm',
      'display': 'viewForm',
      'info': 'viewForm',
      
      // List commands
      'list': 'listForms',
      'forms': 'listForms',
      'all': 'listForms',
      
      // Cancel commands
      'cancel': 'cancel',
      'stop': 'cancel',
      'quit': 'cancel',
      'exit': 'cancel',
      'abort': 'cancel',
      
      // Help commands
      'help': 'help',
      'menu': 'help',
      'commands': 'help',
      '?': 'help',
      
      // Completion commands
      'done': 'done',
      'finish': 'done',
      'complete': 'done',
      'end': 'done',
      
      // Question options
      'options': 'questionOptions',
      'types': 'questionOptions',
      'fields': 'questionOptions'
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

  // Get help text showing available patterns
  getPatternHelp() {
    return `🎯 **Command Patterns** (choose your favorite!):

**Slash Commands** (like Discord/Slack):
\`/new\` \`/export 123\` \`/help\`

**Dot Commands** (simple & clean):
\`.new\` \`.export 123\` \`.help\`

**Hash Commands** (like hashtags):
\`#new\` \`#export 123\` \`#help\`

**Exclamation Commands** (emphatic):
\`!new\` \`!export 123\` \`!help\`

**Arrow Commands** (like terminal):
\`>new\` \`>export 123\` \`>help\`

**Colon Commands** (like IRC):
\`:new\` \`:export 123\` \`:help\`

**Dash Commands** (like CLI):
\`-new\` \`-export 123\` \`-help\`

Pick any style you like - they all work the same!`;
  }

  getCommandHelp() {
    return `📋 **Available Commands**:

🆕 **Create Forms:**
\`new\` \`create\` \`form\` \`start\` \`begin\`

📊 **Export Data:**
\`export [formId]\` \`download [formId]\` \`csv [formId]\` \`data [formId]\`

👀 **View Forms:**
\`view [formId]\` \`show [formId]\` \`info [formId]\`

📝 **List All Forms:**
\`list\` \`forms\` \`all\`

❌ **Cancel:**
\`cancel\` \`stop\` \`quit\` \`exit\`

❓ **Help:**
\`help\` \`menu\` \`?\`

✅ **During Form Creation:**
\`done\` \`finish\` \`complete\`
\`options\` \`types\` (question types)`;
  }
}

module.exports = (adminBot, supabase) => {
  const sessions = {};
  const commandParser = new IntuitiveCommandParser();
  
  adminBot.on('qr', qr => {
    console.log("ADMIN BOT QR - Scan to create forms:");
    require('qrcode-terminal').generate(qr, { small: true });
  });

  adminBot.on('ready', () => console.log('Admin Bot Ready!'));

  adminBot.on('message', async msg => {
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

    // Parse the message for commands
    const parsed = commandParser.parseCommand(text);

    // If we're in a session, handle session-specific commands first
    if (session) {
      await handleSessionWithCommands(msg, chatId, text, session, parsed);
      return;
    }

    // Handle global commands
    if (parsed.isCommand) {
      await handleCommand(msg, chatId, parsed);
    }
    // If not a command, do nothing (normal conversation continues)
  });

  async function handleCommand(msg, chatId, parsed) {
    const { command, args } = parsed;

    switch (command) {
      case 'createForm':
        if (!sessions[chatId]) {
          sessions[chatId] = { step: 'title', fields: [] };
          await msg.reply(`📋 **New Form Creation**\n\nPlease send the form title:`);
        } else {
          await msg.reply(`⚠️ You're already creating a form. Use \`${parsed.pattern === 'slash' ? '/' : parsed.pattern === 'dot' ? '.' : '#'}cancel\` to stop.`);
        }
        break;

      case 'exportData':
        if (args) {
          try {
            const csv = await generateCSV(args, supabase);
            await msg.reply(`📊 **Export Data for Form ${args}**\n\n\`\`\`${csv}\`\`\``);
          } catch (error) {
            await msg.reply(`❌ Error exporting form ${args}: ${error.message}`);
          }
        } else {
          await msg.reply(`📊 **Export Data**\n\nPlease specify form ID:\n\`${getExampleCommand(parsed.pattern)}export 123\``);
        }
        break;

      case 'viewForm':
        if (args) {
          await showFormDetails(msg, args, supabase);
        } else {
          await msg.reply(`👀 **View Form**\n\nPlease specify form ID:\n\`${getExampleCommand(parsed.pattern)}view 123\``);
        }
        break;

      case 'listForms':
        await listAllForms(msg, chatId, supabase);
        break;

      case 'cancel':
        if (sessions[chatId]) {
          delete sessions[chatId];
          await msg.reply(`❌ **Form Creation Cancelled**`);
        } else {
          await msg.reply(`ℹ️ Nothing to cancel right now.`);
        }
        break;

      case 'help':
        await msg.reply(`${commandParser.getCommandHelp()}\n\n${commandParser.getPatternHelp()}`);
        break;

      case 'questionOptions':
        await showQuestionOptions(msg);
        break;

      default:
        await msg.reply(`❓ Unknown command. Use \`${getExampleCommand(parsed.pattern)}help\` for available commands.`);
    }
  }

  async function handleSessionWithCommands(msg, chatId, text, session, parsed) {
    // Handle session commands
    if (parsed.isCommand) {
      switch (parsed.command) {
        case 'cancel':
          delete sessions[chatId];
          await msg.reply(`❌ **Form Creation Cancelled**`);
          return;
          
        case 'done':
          if (session.step === 'questions') {
            await finishForm(msg, chatId, session);
            return;
          }
          break;
          
        case 'questionOptions':
          if (session.step === 'questions') {
            await showQuestionOptions(msg);
            return;
          }
          break;
          
        case 'help':
          await showSessionHelp(msg, session, parsed.pattern);
          return;
      }
    }

    // Handle regular session flow
    switch (session.step) {
      case 'title':
        if (parsed.isCommand) {
          await msg.reply(`⚠️ Please enter the form title (not a command).`);
          return;
        }
        session.title = text;
        session.step = 'questions';
        await msg.reply(`✅ **Title Set:** "${text}"\n\nNow send your first question, or use \`${getExampleCommand('slash')}options\` to see question types.`);
        break;

      case 'questions':
        if (parsed.isCommand) {
          await msg.reply(`⚠️ Please enter a question (not a command), or use \`${getExampleCommand('slash')}done\` to finish.`);
          return;
        }
        session.tempQuestion = text;
        session.step = 'validation';
        await msg.reply(`📝 **Question:** "${text}"\n\nValidation type:\n1️⃣ Text\n2️⃣ Number\n3️⃣ Email\n4️⃣ Rating (1-5)\n5️⃣ Phone\n\nReply with number:`);
        break;

      case 'validation':
        if (parsed.isCommand) {
          await msg.reply(`⚠️ Please enter validation type (1-5).`);
          return;
        }
        const validation = getValidationType(text);
        session.fields.push({
          question: session.tempQuestion,
          ...validation
        });
        session.step = 'questions';
        await msg.reply(`✅ **${validation.type} validation set**\n\nNext question or \`${getExampleCommand('slash')}done\` to finish:`);
        break;
    }
  }

  async function finishForm(msg, chatId, session) {
    if (session.fields.length === 0) {
      await msg.reply(`⚠️ **No Questions Added**\n\nAdd at least one question before finishing.`);
      return;
    }

    const { data } = await supabase
      .from('forms')
      .insert([{ 
        admin_id: chatId, 
        title: session.title, 
        fields: session.fields 
      }])
      .select();

    const formId = data[0].id;
    const formLink = `https://wa.me/${process.env.USER_BOT_NUMBER}?text=START_${formId}`;
    
    await msg.reply(`🎉 **Form Created Successfully!**\n\n**Title:** ${session.title}\n**ID:** ${formId}\n**Questions:** ${session.fields.length}\n\n🔗 **Share Link:**\n${formLink}\n\n📊 **Export later with:**\n\`/export ${formId}\``);
    delete sessions[chatId];
  }

  async function showFormDetails(msg, formId, supabase) {
    try {
      const { data } = await supabase
        .from('forms')
        .select('*')
        .eq('id', formId)
        .single();

      if (!data) {
        await msg.reply(`❌ **Form ${formId} not found**`);
        return;
      }

      let details = `📋 **Form Details**\n\n**Title:** ${data.title}\n**ID:** ${formId}\n**Questions:** ${data.fields.length}\n\n`;
      
      data.fields.forEach((field, index) => {
        details += `${index + 1}. ${field.question} _(${field.type})_\n`;
      });

      await msg.reply(details);
    } catch (error) {
      await msg.reply(`❌ **Error:** ${error.message}`);
    }
  }

  async function listAllForms(msg, chatId, supabase) {
    try {
      const { data } = await supabase
        .from('forms')
        .select('id, title, created_at, fields')
        .eq('admin_id', chatId)
        .order('created_at', { ascending: false });

      if (!data || data.length === 0) {
        await msg.reply(`📝 **No Forms Found**\n\nCreate your first form with \`/new\``);
        return;
      }

      let list = `📋 **Your Forms** (${data.length})\n\n`;
      data.forEach((form, index) => {
        const date = new Date(form.created_at).toLocaleDateString();
        list += `${index + 1}. **${form.title}**\n   ID: ${form.id} | ${form.fields.length} questions | ${date}\n\n`;
      });

      list += `💡 Use \`/view [ID]\` to see details or \`/export [ID]\` for data`;
      await msg.reply(list);
    } catch (error) {
      await msg.reply(`❌ **Error:** ${error.message}`);
    }
  }

  async function showQuestionOptions(msg) {
    await msg.reply(`📌 **Question Types**\n\n1️⃣ **Text** - Any written response\n2️⃣ **Number** - Numbers only\n3️⃣ **Email** - Valid email addresses\n4️⃣ **Rating** - Scale of 1-5\n5️⃣ **Phone** - Phone numbers\n\nJust type your question, then choose validation type!`);
  }

  async function showSessionHelp(msg, session, pattern) {
    const example = getExampleCommand(pattern);
    
    if (session.step === 'title') {
      await msg.reply(`📋 **Form Creation - Step 1**\n\nPlease enter your form title.\n\n**Commands:**\n\`${example}cancel\` - Cancel creation`);
    } else if (session.step === 'questions') {
      await msg.reply(`📝 **Form Creation - Adding Questions**\n\nType your questions normally.\n\n**Commands:**\n\`${example}done\` - Finish form\n\`${example}options\` - Question types\n\`${example}cancel\` - Cancel creation`);
    } else {
      await msg.reply(`⚙️ **Form Creation - Validation**\n\nChoose validation type (1-5).\n\n**Commands:**\n\`${example}cancel\` - Cancel creation`);
    }
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

  function getValidationType(choice) {
    const types = {
      '1': { type: 'text', pattern: null, errorMsg: 'Please enter text' },
      '2': { type: 'number', pattern: '^\\d+$', errorMsg: 'Numbers only' },
      '3': { type: 'email', pattern: '@', errorMsg: 'Valid email required' },
      '4': { type: 'rating', pattern: '^[1-5]$', errorMsg: 'Rate 1-5' },
      '5': { type: 'phone', pattern: '^\\+?[0-9]{10,}$', errorMsg: 'Valid phone number required' }
    };
    return types[choice] || types['1'];
  }
};