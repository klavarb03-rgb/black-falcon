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
    '👋 <b>Manager Bot</b>\n\n' +
    'Операції з матеріальними цінностями.\n\n' +
    'Обери дію:',
    {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '📋 Список МЦ', callback_data: 'list_all' },
            { text: '🔍 Пошук', callback_data: 'search' }
          ],
          [
            { text: '✅ На балансі', callback_data: 'list_on' },
            { text: '📦 Позабаланс', callback_data: 'list_off' }
          ],
          [
            { text: '📊 Статистика', callback_data: 'stats' },
            { text: '❓ Допомога', callback_data: 'help' }
          ]
        ]
      }
    }
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

// Handle callback queries (inline buttons)
bot.on('callback_query:data', async (ctx) => {
  const data = ctx.callbackQuery.data;
  
  await ctx.answerCallbackQuery();
  
  if (data === 'list_all') {
    await handleListCommand(ctx);
  } else if (data === 'list_on') {
    await handleListOnBalance(ctx);
  } else if (data === 'list_off') {
    await handleListOffBalance(ctx);
  } else if (data === 'search') {
    await ctx.reply('🔍 <b>Пошук МЦ</b>\n\nВведи назву або опис МЦ для пошуку.\n\nПриклад: <code>Дрон DJI</code>', { parse_mode: 'HTML' });
  } else if (data === 'stats') {
    await handleStatsCommand(ctx);
  } else if (data === 'help') {
    await ctx.reply(
      '📖 <b>Довідка</b>\n\n' +
      '<b>Кнопки:</b>\n' +
      '📋 Список МЦ - Всі матеріальні цінності\n' +
      '✅ На балансі - Тільки на балансі\n' +
      '📦 Позабаланс - Тільки позабаланс\n' +
      '🔍 Пошук - Знайти за назвою\n' +
      '📊 Статистика - Загальна статистика\n\n' +
      '<b>Команди:</b>\n' +
      '/search [назва] - Пошук МЦ\n' +
      '/list - Список всіх МЦ',
      { parse_mode: 'HTML' }
    );
  }
});

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
