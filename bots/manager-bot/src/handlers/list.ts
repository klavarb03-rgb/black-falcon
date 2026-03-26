import { Context } from 'grammy';
import { api } from '../api.js';

export async function handleListCommand(ctx: Context) {
  try {
    await ctx.reply('⏳ Завантажую список МЦ...');

    const response = await api.getItems({ limit: 20 });
    const items = response.data;

    if (items.length === 0) {
      await ctx.reply('📋 Список МЦ порожній');
      return;
    }

    let message = `📋 <b>Матеріальні цінності</b>\n`;
    message += `Всього: ${response.pagination?.total || items.length}\n\n`;

    items.forEach((item, index) => {
      const statusEmoji = item.balance_status === 'on_balance' ? '✅' : '📦';
      const quantityText = item.quantity > 1 ? `${item.quantity} ${item.unit || 'шт'}` : '1 шт';
      
      message += `${index + 1}. ${statusEmoji} <b>${item.name}</b>\n`;
      message += `   Кількість: ${quantityText}\n`;
      if (item.document_number) {
        message += `   Документ: ${item.document_number}\n`;
      }
      message += `   ID: <code>${item.id}</code>\n\n`;
    });

    if (response.pagination && response.pagination.pages > 1) {
      message += `\n📄 Сторінка ${response.pagination.page} з ${response.pagination.pages}`;
    }

    await ctx.reply(message, { parse_mode: 'HTML' });
  } catch (error: any) {
    console.error('List error:', error);
    await ctx.reply(`❌ Помилка отримання списку: ${error.message}`);
  }
}

export async function handleListOnBalance(ctx: Context) {
  try {
    const response = await api.getItems({ balance_status: 'on_balance', limit: 20 });
    const items = response.data;

    if (items.length === 0) {
      await ctx.reply('📋 Немає МЦ на балансі');
      return;
    }

    let message = `✅ <b>МЦ на балансі</b>\n`;
    message += `Всього: ${response.pagination?.total || items.length}\n\n`;

    items.forEach((item, index) => {
      message += `${index + 1}. <b>${item.name}</b>\n`;
      message += `   ${item.quantity} ${item.unit || 'шт'}\n`;
      message += `   Документ: ${item.document_number || 'N/A'}\n`;
      message += `   Дата: ${item.document_date || 'N/A'}\n\n`;
    });

    await ctx.reply(message, { parse_mode: 'HTML' });
  } catch (error: any) {
    console.error('List on_balance error:', error);
    await ctx.reply(`❌ Помилка: ${error.message}`);
  }
}

export async function handleListOffBalance(ctx: Context) {
  try {
    const response = await api.getItems({ balance_status: 'off_balance', limit: 20 });
    const items = response.data;

    if (items.length === 0) {
      await ctx.reply('📋 Немає МЦ позабаланс');
      return;
    }

    let message = `📦 <b>МЦ позабаланс</b>\n`;
    message += `Всього: ${response.pagination?.total || items.length}\n\n`;

    items.forEach((item, index) => {
      message += `${index + 1}. <b>${item.name}</b>\n`;
      message += `   ${item.quantity} ${item.unit || 'шт'}\n`;
      if (item.description) {
        message += `   ${item.description.slice(0, 50)}...\n`;
      }
      message += `\n`;
    });

    await ctx.reply(message, { parse_mode: 'HTML' });
  } catch (error: any) {
    console.error('List off_balance error:', error);
    await ctx.reply(`❌ Помилка: ${error.message}`);
  }
}
