import { Bot } from 'grammy';
import dotenv from 'dotenv';
import { api } from './api.js';
import { handleListCommand, handleListOnBalance, handleListOffBalance } from './handlers/list.js';
import { handleSearchCommand } from './handlers/search.js';
import { handleStatsCommand } from './handlers/stats.js';

dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN not found in .env file');
  process.exit(1);
}

const bot = new Bot(BOT_TOKEN);

// Middleware: log
bot.use(async (ctx, next) => {
  const user = ctx.from;
  console.log(`[${new Date().toISOString()}] User ${user?.id} (${user?.username || 'no-username'}): ${ctx.message?.text || 'non-text'}`);
  await next();
});

// Commands
bot.command('start', async (ctx) => {
  await ctx.reply(
    '👋 <b>Black Falcon Boss Bot</b>\n\n' +
    'Бот для операцій керівника з матеріальними цінностями.\n\n' +
    '<b>Команди:</b>\n' +
    '/list - Показати всі МЦ\n' +
    '/list_on_balance - МЦ на балансі\n' +
    '/list_off_balance - МЦ позабаланс\n' +
    '/search [запит] - Пошук МЦ\n' +
    '/stats - Статистика\n' +
    '/help - Довідка\n\n' +
    '<i>Версія: 1.0.0-MVP</i>',
    { parse_mode: 'HTML' }
  );
});

bot.command('help', async (ctx) => {
  await ctx.reply(
    '📖 <b>Довідка Manager Bot</b>\n\n' +
    '<b>Перегляд МЦ:</b>\n' +
    '/list - Всі матеріальні цінності\n' +
    '/list_on_balance - Тільки на балансі\n' +
    '/list_off_balance - Тільки позабаланс\n\n' +
    '<b>Пошук:</b>\n' +
    '/search [назва] - Знайти МЦ за назвою або описом\n' +
    'Приклад: /search палатка\n\n' +
    '<b>Статистика:</b>\n' +
    '/stats - Загальна статистика системи\n\n' +
    '<b>Підтримка:</b>\n' +
    'За питаннями звертайтесь до @Roman_Bir_ua',
    { parse_mode: 'HTML' }
  );
});

bot.command('list', handleListCommand);
bot.command('list_on_balance', handleListOnBalance);
bot.command('list_off_balance', handleListOffBalance);
bot.command('search', handleSearchCommand);
bot.command('stats', handleStatsCommand);

// Unknown commands
bot.on('message:text', async (ctx) => {
  if (ctx.message.text.startsWith('/')) {
    await ctx.reply(
      '❓ Невідома команда. Використовуйте /help для списку команд.'
    );
  }
});

// Error handler
bot.catch((err) => {
  console.error('❌ Bot error:', err);
});

// Start
async function main() {
  console.log('🔄 Перевірка підключення до Black Falcon API...');
  
  const isHealthy = await api.healthCheck();
  if (!isHealthy) {
    console.warn('⚠️ Black Falcon API недоступний.');
  } else {
    console.log('✅ Black Falcon API доступний');
  }

  console.log('🚀 Starting Black Falcon Manager Bot...');
  bot.start({
    onStart: (botInfo) => {
      console.log(`✅ Bot @${botInfo.username} is running!`);
      console.log(`   Bot ID: ${botInfo.id}`);
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
