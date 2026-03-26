import { Bot, session } from 'grammy';
import dotenv from 'dotenv';
import { handleImportCommand, handleDocumentUpload } from './handlers/import.js';
import { handleTemplateCommand } from './handlers/template.js';
import { api } from './api.js';

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
    '👋 <b>Бот Імпорту Black Falcon</b>\n\n' +
    'Я допоможу завантажити матеріальні цінності через Excel файли.\n\n' +
    '<b>Команди:</b>\n' +
    '/import_excel - Завантажити Excel з МЦ\n' +
    '/template - Отримати шаблон Excel\n' +
    '/help - Довідка\n\n' +
    '<i>Версія: 1.0.0-MVP</i>',
    { parse_mode: 'HTML' }
  );
});

bot.command('help', async (ctx) => {
  await ctx.reply(
    '📖 <b>Довідка Black Falcon Import Bot</b>\n\n' +
    '<b>Як користуватися:</b>\n' +
    '1. Отримайте шаблон командою /template\n' +
    '2. Заповніть таблицю Excel своїми даними\n' +
    '3. Надішліть файл боту командою /import_excel\n\n' +
    '<b>Формат таблиці:</b>\n' +
    '• Назва (обов\'язково)\n' +
    '• Категорія\n' +
    '• Кількість (число)\n' +
    '• Одиниця виміру\n' +
    '• Опис\n' +
    '• Статус балансу (on_balance / off_balance)\n' +
    '• Номер документа (для on_balance)\n' +
    '• Дата документа (для on_balance, формат YYYY-MM-DD)\n' +
    '• Постачальник (для on_balance)\n\n' +
    '⚠️ Для матеріалів "на балансі" обов\'язково заповнити: номер документа, дату та постачальника.\n\n' +
    '<b>Підтримка:</b>\n' +
    'За питаннями звертайтесь до @Roman_Bir_ua',
    { parse_mode: 'HTML' }
  );
});

bot.command('import_excel', handleImportCommand);
bot.command('template', handleTemplateCommand);

// Handle document uploads
bot.on('message:document', handleDocumentUpload);

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
  console.log('🔄 Перевірка підключення до Black Falcon API...');
  
  const isHealthy = await api.healthCheck();
  if (!isHealthy) {
    console.warn('⚠️ Black Falcon API недоступний. Бот запуститься, але імпорт не працюватиме.');
    console.warn('   Перевірте API_URL та API_TOKEN в .env файлі.');
  } else {
    console.log('✅ Black Falcon API доступний');
  }

  console.log('🚀 Starting Black Falcon Import Bot...');
  bot.start({
    onStart: (botInfo) => {
      console.log(`✅ Bot @${botInfo.username} is running!`);
      console.log(`   Bot ID: ${botInfo.id}`);
      console.log(`   Name: ${botInfo.first_name}`);
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
