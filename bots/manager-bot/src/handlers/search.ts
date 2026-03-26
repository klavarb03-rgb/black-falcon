import { Context } from 'grammy';
import { api } from '../api.js';

export async function handleSearchCommand(ctx: Context) {
  const query = ctx.match as string;

  if (!query || query.trim().length < 2) {
    await ctx.reply('🔍 Введіть запит для пошуку (мінімум 2 символи)\n\nПриклад: /search палатка');
    return;
  }

  try {
    await ctx.reply('🔍 Шукаю...');

    const items = await api.searchItems(query.trim());

    if (items.length === 0) {
      await ctx.reply(`❌ Нічого не знайдено за запитом: "${query}"`);
      return;
    }

    let message = `🔍 <b>Результати пошуку: "${query}"</b>\n`;
    message += `Знайдено: ${items.length}\n\n`;

    items.slice(0, 10).forEach((item, index) => {
      const statusEmoji = item.balance_status === 'on_balance' ? '✅' : '📦';
      
      message += `${index + 1}. ${statusEmoji} <b>${item.name}</b>\n`;
      message += `   Кількість: ${item.quantity} ${item.unit || 'шт'}\n`;
      
      if (item.description) {
        const desc = item.description.slice(0, 60);
        message += `   ${desc}${item.description.length > 60 ? '...' : ''}\n`;
      }
      
      message += `   ID: <code>${item.id}</code>\n\n`;
    });

    if (items.length > 10) {
      message += `\n... та ще ${items.length - 10} результатів`;
    }

    await ctx.reply(message, { parse_mode: 'HTML' });
  } catch (error: any) {
    console.error('Search error:', error);
    await ctx.reply(`❌ Помилка пошуку: ${error.message}`);
  }
}
