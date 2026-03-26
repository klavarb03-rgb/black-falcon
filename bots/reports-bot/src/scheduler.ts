import cron from 'node-cron';
import { Bot } from 'grammy';
import { api } from './api.js';

export function setupScheduledReports(bot: Bot, adminChatId?: string) {
  if (!adminChatId) {
    console.warn('⚠️ ADMIN_CHAT_ID не встановлено. Автоматичні звіти вимкнено.');
    return;
  }

  // Щоденний звіт о 09:00
  cron.schedule('0 9 * * *', async () => {
    try {
      console.log('[Scheduler] Generating daily report...');
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
        `📦 <b>Позабаланс:</b> ${stats.offBalanceCount}\n\n`;
      
      await bot.api.sendMessage(adminChatId, message, { parse_mode: 'HTML' });
      console.log('[Scheduler] Daily report sent');
    } catch (error) {
      console.error('[Scheduler] Daily report error:', error);
    }
  }, {
    timezone: 'Europe/Kiev'
  });

  // Тижневий звіт (понеділок о 10:00)
  cron.schedule('0 10 * * 1', async () => {
    try {
      console.log('[Scheduler] Generating weekly report...');
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
      
      await bot.api.sendMessage(adminChatId, message, { parse_mode: 'HTML' });
      console.log('[Scheduler] Weekly report sent');
    } catch (error) {
      console.error('[Scheduler] Weekly report error:', error);
    }
  }, {
    timezone: 'Europe/Kiev'
  });

  console.log('✅ Scheduled reports enabled:');
  console.log('   - Daily report: 09:00 (Europe/Kiev)');
  console.log('   - Weekly report: Monday 10:00 (Europe/Kiev)');
}
