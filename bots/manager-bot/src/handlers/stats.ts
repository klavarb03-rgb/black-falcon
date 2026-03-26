import { Context } from 'grammy';
import { api } from '../api.js';

export async function handleStatsCommand(ctx: Context) {
  try {
    await ctx.reply('📊 Завантажую статистику...');

    const stats = await api.getDashboardStats();

    let message = `📊 <b>Статистика Black Falcon</b>\n\n`;
    
    message += `📦 <b>Всього МЦ:</b> ${stats.totalItems || 0}\n`;
    message += `✅ <b>На балансі:</b> ${stats.onBalanceCount || 0}\n`;
    message += `📦 <b>Позабаланс:</b> ${stats.offBalanceCount || 0}\n\n`;
    
    if (stats.totalValue) {
      message += `💰 <b>Загальна вартість:</b> ${stats.totalValue} грн\n`;
    }
    
    if (stats.recentOperations) {
      message += `\n🔄 <b>Останні операції:</b> ${stats.recentOperations}\n`;
    }

    await ctx.reply(message, { parse_mode: 'HTML' });
  } catch (error: any) {
    console.error('Stats error:', error);
    await ctx.reply(`❌ Помилка отримання статистики: ${error.message}`);
  }
}
