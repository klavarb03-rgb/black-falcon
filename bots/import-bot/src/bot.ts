import { Bot } from 'grammy';
import dotenv from 'dotenv';
import { handleImportCommand, handleDocumentUpload } from './handlers/import.js';
import { handleTemplateCommand } from './handlers/template.js';
import { 
  handlePhotoDocument, 
  handlePdfDocument,
  handleStatusSelection,
  handleImportConfirm,
  handleImportCancel 
} from './handlers/ocr.js';
import { handleWordDocument } from './handlers/word.js';
import { handleVoiceMessage } from './handlers/voice.js';
import { api } from './api.js';
import { ollama } from './services/ollama.js';

dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN not found in .env file');
  process.exit(1);
}

const bot = new Bot(BOT_TOKEN);

// Middleware: log all messages
bot.use(async (ctx, next) => {
  const user = ctx.from;
  console.log(`[${new Date().toISOString()}] User ${user?.id} (${user?.username || 'no-username'}): ${ctx.message?.text || ctx.callbackQuery?.data || 'non-text'}`);
  await next();
});

// Commands
bot.command('start', async (ctx) => {
  await ctx.reply(
    '👋 <b>Black Falcon Import Bot</b>\n\n' +
    'Імпортуй МЦ через:\n' +
    '📸 Фото накладних/документів (OCR)\n' +
    '📄 PDF файли (OCR)\n' +
    '📊 Excel таблиці\n' +
    '📝 Word документи\n' +
    '🎤 Голосові повідомлення (запити)\n\n' +
    'Просто надішли документ — я розпізнаю і додам на склад!',
    {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '📋 Шаблон Excel', callback_data: 'template' },
            { text: '❓ Допомога', callback_data: 'help' }
          ]
        ]
      }
    }
  );
});

bot.command('help', async (ctx) => {
  await ctx.reply(
    '📖 <b>Довідка Black Falcon Import Bot</b>\n\n' +
    '<b>Підтримувані формати:</b>\n\n' +
    '📸 <b>Фото/Скани</b>\n' +
    '• JPG, PNG, HEIC\n' +
    '• Накладні, рахунки, акти\n' +
    '• Автоматичне OCR розпізнавання\n\n' +
    '📄 <b>PDF документи</b>\n' +
    '• Одно- та багатосторінкові\n' +
    '• OCR розпізнавання тексту\n\n' +
    '📊 <b>Excel таблиці</b>\n' +
    '• XLSX, XLS, CSV\n' +
    '• Шаблон: /template\n' +
    '• Команда: /import_excel\n\n' +
    '📝 <b>Word документи</b>\n' +
    '• DOCX, DOC, TXT\n' +
    '• Автоматичний парсинг\n\n' +
    '🎤 <b>Голосові повідомлення</b>\n' +
    '• Запити інформації\n' +
    '• "Скільки антибіотиків у Івана?"\n\n' +
    '<b>Як користуватися:</b>\n' +
    '1️⃣ Надішліть документ (фото/файл)\n' +
    '2️⃣ Я розпізнаю дані\n' +
    '3️⃣ Оберіть статус (Державне/Волонтерське)\n' +
    '4️⃣ Підтвердіть імпорт\n\n' +
    '<b>Підтримка:</b> @Roman_Bir_ua',
    { parse_mode: 'HTML' }
  );
});

bot.command('import_excel', handleImportCommand);
bot.command('template', handleTemplateCommand);

// Handle callback queries (inline buttons)
bot.on('callback_query:data', async (ctx) => {
  const data = ctx.callbackQuery.data;
  
  // OCR status selection
  if (data === 'status_state' || data === 'status_volunteer') {
    await handleStatusSelection(ctx);
    return;
  }

  // Import confirmation/cancel
  if (data.startsWith('import_confirm_')) {
    await handleImportConfirm(ctx);
    return;
  }

  if (data === 'import_cancel') {
    await handleImportCancel(ctx);
    return;
  }

  // Other buttons
  await ctx.answerCallbackQuery();
  
  if (data === 'template') {
    await handleTemplateCommand(ctx);
  } else if (data === 'help') {
    await ctx.reply(
      '📖 <b>Довідка</b>\n\n' +
      '<b>Надішліть:</b>\n' +
      '📸 Фото документа (OCR)\n' +
      '📄 PDF файл\n' +
      '📊 Excel таблицю\n' +
      '📝 Word документ\n' +
      '🎤 Голосове повідомлення\n\n' +
      'Бот автоматично розпізнає формат!',
      { parse_mode: 'HTML' }
    );
  }
});

// Handle photos (OCR)
bot.on('message:photo', handlePhotoDocument);

// Handle voice messages
bot.on('message:voice', handleVoiceMessage);

// Handle document uploads (routing by type)
bot.on('message:document', async (ctx) => {
  const doc = ctx.message?.document;
  const fileName = doc?.file_name?.toLowerCase() || '';

  if (fileName.endsWith('.pdf')) {
    await handlePdfDocument(ctx);
  } else if (fileName.endsWith('.docx') || fileName.endsWith('.doc') || fileName.endsWith('.txt')) {
    await handleWordDocument(ctx);
  } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
    await handleDocumentUpload(ctx); // Existing Excel handler
  } else {
    await ctx.reply('❌ Непідтримуваний формат файлу.\n\nПідтримуються: PDF, Word (DOCX/DOC), Excel (XLSX/XLS/CSV), TXT');
  }
});

// Handle unknown commands
bot.on('message:text', async (ctx) => {
  if (ctx.message.text.startsWith('/')) {
    await ctx.reply(
      '❓ Невідома команда. Використовуйте /help для списку доступних команд.'
    );
  }
});

// Error handler
bot.catch((err) => {
  console.error('❌ Bot error:', err);
});

// Start bot
async function main() {
  console.log('🔄 Перевірка підключення до сервісів...\n');
  
  // Check Black Falcon API
  const isApiHealthy = await api.healthCheck();
  if (!isApiHealthy) {
    console.warn('⚠️ Black Falcon API недоступний');
    console.warn('   Перевірте API_URL та API_TOKEN в .env файлі\n');
  } else {
    console.log('✅ Black Falcon API доступний');
  }

  // Check Ollama API
  const isOllamaHealthy = await ollama.healthCheck();
  if (!isOllamaHealthy) {
    console.warn('⚠️ Ollama API недоступний');
    console.warn('   OCR/парсинг документів не працюватиме\n');
  } else {
    console.log('✅ Ollama API доступний');
  }

  console.log('\n🚀 Starting Black Falcon Import Bot...');
  bot.start({
    onStart: (botInfo) => {
      console.log(`✅ Bot @${botInfo.username} is running!`);
      console.log(`   Bot ID: ${botInfo.id}`);
      console.log(`   Name: ${botInfo.first_name}`);
      console.log('\n📝 Підтримувані формати:');
      console.log('   📸 Фото (JPG, PNG, HEIC) — OCR');
      console.log('   📄 PDF — OCR');
      console.log('   📊 Excel (XLSX, XLS, CSV)');
      console.log('   📝 Word (DOCX, DOC, TXT)');
      console.log('   🎤 Голосові повідомлення');
    },
  });
}

main().catch((error) => {
  console.error('❌ Failed to start bot:', error);
  process.exit(1);
});

// Graceful shutdown
process.once('SIGINT', () => {
  console.log('\n⏹️  Stopping bot...');
  bot.stop();
});
process.once('SIGTERM', () => {
  console.log('\n⏹️  Stopping bot...');
  bot.stop();
});
