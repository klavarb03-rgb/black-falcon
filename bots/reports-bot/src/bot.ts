import { Bot } from 'grammy';
import dotenv from 'dotenv';
import { api } from './api.js';
import { setupScheduledReports } from './scheduler.js';

dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN not found in .env file');
  process.exit(1);
}

const bot = new Bot(BOT_TOKEN);

// Middleware: log
bot.use(async (ctx, next) => {
  const user = ctx.from;
  console.log(`[${new Date().toISOString()}] User ${user?.id} (${user?.username || 'no-username'}): ${ctx.message?.text || 'callback'}`);
  await next();
});

// Commands
bot.command('start', async (ctx) => {
  await ctx.reply(
    '👋 <b>Reports Bot</b>\n\n' +
    'Автоматичні звіти та алерти.\n\n' +
    'Обери дію:',
    {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '📊 Щоденний звіт', callback_data: 'report_daily' },
            { text: '📈 Тижневий звіт', callback_data: 'report_weekly' }
          ],
          [
            { text: '⚙️ Налаштування', callback_data: 'settings' },
            { text: '❓ Допомога', callback_data: 'help' }
          ]
        ]
      }
    }
  );
});

bot.command('help', async (ctx) => {
  await ctx.reply(
    '📖 <b>Довідка Reports Bot</b>\n\n' +
    '<b>Звіти:</b>\n' +
    '/report_daily - Отримати щоденний звіт\n' +
    '/report_weekly - Отримати тижневий звіт\n\n' +
    '<b>Налаштування:</b>\n' +
    '/set_chat_id - Встановити chat для автоматичних звітів\n\n' +
    '<b>Автоматичні звіти:</b>\n' +
    '• Щоденний: 09:00 (Kyiv)\n' +
    '• Тижневий: Понеділок 10:00 (Kyiv)\n\n' +
    '<b>Підтримка:</b>\n' +
    '@Roman_Bir_ua',
    { parse_mode: 'HTML' }
  );
});

bot.command('report_daily', async (ctx) => {
  try {
    await ctx.reply('⏳ Генерую щоденний звіт...');
    
    const stats = await api.getDashboardStats();
    
    const message = 
      `📊 <b>Щоденний звіт Black Falcon</b>\n` +
      `🕐 ${new Date().toLocaleDateString('uk-UA', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}\n\n` +
      `📦 <b>Всього МЦ:</b> ${stats.totalItems}\n` +
      `✅ <b>На балансі:</b> ${stats.onBalanceCount}\n` +
      `📦 <b>Позабаланс:</b> ${stats.offBalanceCount}\n`;
    
    await ctx.reply(message, { parse_mode: 'HTML' });
  } catch (error: any) {
    console.error('Daily report error:', error);
    await ctx.reply(`❌ Помилка генерації звіту: ${error.message}`);
  }
});

bot.command('report_weekly', async (ctx) => {
  try {
    await ctx.reply('⏳ Генерую тижневий звіт...');
    
    const stats = await api.getDashboardStats();
    const operations = await api.getRecentOperations(20);
    
    let message = 
      `📈 <b>Тижневий звіт Black Falcon</b>\n` +
      `🗓 ${new Date().toLocaleDateString('uk-UA')}\n\n` +
      `📊 <b>Статистика:</b>\n` +
      `📦 Всього МЦ: ${stats.totalItems}\n` +
      `✅ На балансі: ${stats.onBalanceCount}\n` +
      `📦 Позабаланс: ${stats.offBalanceCount}\n\n`;
    
    if (operations.length > 0) {
      message += `🔄 <b>Останні операції:</b> ${operations.length}\n`;
    }
    
    await ctx.reply(message, { parse_mode: 'HTML' });
  } catch (error: any) {
    console.error('Weekly report error:', error);
    await ctx.reply(`❌ Помилка генерації звіту: ${error.message}`);
  }
});

bot.command('set_chat_id', async (ctx) => {
  const chatId = ctx.chat?.id;
  
  if (!chatId) {
    await ctx.reply('❌ Не вдалось отримати chat_id');
    return;
  }
  
  await ctx.reply(
    `✅ <b>Ваш chat_id:</b> <code>${chatId}</code>\n\n` +
    `Додайте цей ID в .env файл:\n` +
    `<code>ADMIN_CHAT_ID=${chatId}</code>\n\n` +
    `Після додавання перезапустіть бота для активації автоматичних звітів.`,
    { parse_mode: 'HTML' }
  );
});

// Handle callback queries (inline buttons)
bot.on('callback_query:data', async (ctx) => {
  const data = ctx.callbackQuery.data;
  
  await ctx.answerCallbackQuery();
  
  if (data === 'report_daily') {
    try {
      await ctx.reply('⏳ Генерую щоденний звіт...');
      const stats = await api.getDashboardStats();
      
      const message = 
        `📊 <b>Щоденний звіт</b>\n` +
        `🕐 ${new Date().toLocaleDateString('uk-UA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n\n` +
        `📦 <b>Всього МЦ:</b> ${stats.totalItems}\n` +
        `✅ <b>На балансі:</b> ${stats.onBalanceCount}\n` +
        `📦 <b>Позабаланс:</b> ${stats.offBalanceCount}\n`;
      
      await ctx.reply(message, { parse_mode: 'HTML' });
    } catch (error: any) {
      await ctx.reply(`❌ Помилка: ${error.message}`);
    }
  } else if (data === 'report_weekly') {
    try {
      await ctx.reply('⏳ Генерую тижневий звіт...');
      const stats = await api.getDashboardStats();
      const operations = await api.getRecentOperations(20);
      
      let message = 
        `📈 <b>Тижневий звіт</b>\n` +
        `🗓 ${new Date().toLocaleDateString('uk-UA')}\n\n` +
        `📊 <b>Статистика:</b>\n` +
        `📦 Всього МЦ: ${stats.totalItems}\n` +
        `✅ На балансі: ${stats.onBalanceCount}\n` +
        `📦 Позабаланс: ${stats.offBalanceCount}\n\n`;
      
      if (operations.length > 0) {
        message += `🔄 <b>Останні операції:</b> ${operations.length}\n`;
      }
      
      await ctx.reply(message, { parse_mode: 'HTML' });
    } catch (error: any) {
      await ctx.reply(`❌ Помилка: ${error.message}`);
    }
  } else if (data === 'settings') {
    const chatId = ctx.chat?.id;
    await ctx.reply(
      `⚙️ <b>Налаштування</b>\n\n` +
      `<b>Ваш chat_id:</b> <code>${chatId}</code>\n\n` +
      `<b>Автоматичні звіти:</b>\n` +
      `• Щоденний: 09:00 (Kyiv)\n` +
      `• Тижневий: Пн 10:00 (Kyiv)\n\n` +
      `Щоб активувати, додай в .env:\n` +
      `<code>ADMIN_CHAT_ID=${chatId}</code>`,
      { parse_mode: 'HTML' }
    );
  } else if (data === 'help') {
    await ctx.reply(
      '📖 <b>Довідка</b>\n\n' +
      '<b>Кнопки:</b>\n' +
      '📊 Щоденний звіт - Статистика за сьогодні\n' +
      '📈 Тижневий звіт - Статистика за тиждень\n' +
      '⚙️ Налаштування - Chat ID та графік\n\n' +
      '<b>Автоматичні звіти:</b>\n' +
      '• Щоденний: 09:00\n' +
      '• Тижневий: Понеділок 10:00',
      { parse_mode: 'HTML' }
    );
  }
});

// Unknown commands
bot.on('message:text', async (ctx) => {
  if (ctx.message.text.startsWith('/')) {
    await ctx.reply('❓ Невідома команда. Використовуйте /help');
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

  // Setup scheduled reports
  setupScheduledReports(bot, ADMIN_CHAT_ID);

  console.log('🚀 Starting Black Falcon Reports Bot...');
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
