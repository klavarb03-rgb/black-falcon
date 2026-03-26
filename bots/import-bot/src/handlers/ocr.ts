import { Context, InlineKeyboard } from 'grammy';
import axios from 'axios';
import { ollama, ParsedItem } from '../services/ollama.js';
import { api } from '../api.js';

// Temporary storage for parsed items (per user) - EXPORTED
export const userParsedItems = new Map<number, ParsedItem[]>();

export async function handlePhotoDocument(ctx: Context) {
  const photo = ctx.message?.photo;
  
  if (!photo || photo.length === 0) {
    await ctx.reply('❌ Фото не знайдено');
    return;
  }

  await ctx.reply('⏳ Розпізнаю фото...');

  try {
    // Get highest resolution photo
    const largestPhoto = photo[photo.length - 1];
    const file = await ctx.api.getFile(largestPhoto.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${ctx.api.token}/${file.file_path}`;
    
    // Download image
    const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data);

    // Convert to base64
    const base64Image = buffer.toString('base64');

    // Parse with Ollama Vision
    const result = await ollama.parseImageDocument(base64Image);

    if (!result.items || result.items.length === 0) {
      await ctx.reply('❌ Не вдалося розпізнати жодного МЦ. Спробуйте чіткіше фото або інший документ.');
      return;
    }

    // Store parsed items
    const userId = ctx.from?.id;
    if (userId) {
      userParsedItems.set(userId, result.items);
    }

    // Show preview
    await showItemsPreview(ctx, result.items);

  } catch (error: any) {
    console.error('OCR error:', error);
    await ctx.reply(`❌ Помилка розпізнавання: ${error.message || 'Невідома помилка'}`);
  }
}

export async function handlePdfDocument(ctx: Context) {
  const doc = ctx.message?.document;
  
  if (!doc) {
    await ctx.reply('❌ Файл не знайдено');
    return;
  }

  const fileName = doc.file_name || '';
  if (!fileName.toLowerCase().endsWith('.pdf')) {
    await ctx.reply('❌ Цей handler підтримує тільки PDF файли');
    return;
  }

  await ctx.reply('⏳ Обробляю PDF... (це може зайняти хвилину)');

  try {
    // Download file from Telegram
    const file = await ctx.api.getFile(doc.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${ctx.api.token}/${file.file_path}`;
    
    const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data);

    // For now, convert first page to image and OCR
    // TODO: multi-page PDF support
    const base64Image = buffer.toString('base64');

    // Parse with Ollama Vision
    const result = await ollama.parseImageDocument(base64Image);

    if (!result.items || result.items.length === 0) {
      await ctx.reply('❌ Не вдалося розпізнати жодного МЦ. Перевірте якість PDF.');
      return;
    }

    // Store parsed items
    const userId = ctx.from?.id;
    if (userId) {
      userParsedItems.set(userId, result.items);
    }

    // Show preview
    await showItemsPreview(ctx, result.items);

  } catch (error: any) {
    console.error('PDF OCR error:', error);
    await ctx.reply(`❌ Помилка обробки PDF: ${error.message || 'Невідома помилка'}`);
  }
}

export async function showItemsPreview(ctx: Context, items: ParsedItem[]) {
  let message = '✅ <b>Розпізнано МЦ:</b>\n\n';

  items.forEach((item, index) => {
    message += `${index + 1}️⃣ <b>${item.name}</b>\n`;
    if (item.serial) message += `   Серійний: ${item.serial}\n`;
    message += `   Кількість: ${item.quantity} ${item.unit}\n`;
    if (item.price) message += `   Ціна: ${item.price} грн\n`;
    if (item.notes) message += `   Примітки: ${item.notes}\n`;
    message += '\n';
  });

  message += '❓ <b>Оберіть статус для всіх МЦ:</b>';

  const keyboard = new InlineKeyboard()
    .text('Державне', 'status_state')
    .text('Волонтерське', 'status_volunteer');

  await ctx.reply(message, {
    parse_mode: 'HTML',
    reply_markup: keyboard,
  });
}

export async function handleStatusSelection(ctx: Context) {
  const callbackData = ctx.callbackQuery?.data;
  const userId = ctx.from?.id;

  if (!userId || !callbackData) return;

  const items = userParsedItems.get(userId);
  if (!items || items.length === 0) {
    await ctx.answerCallbackQuery();
    await ctx.reply('❌ Розпізнані дані не знайдено. Надішліть документ заново.');
    return;
  }

  const status = callbackData === 'status_state' ? 'Державне' : 'Волонтерське';

  // Show confirmation
  let message = `✅ <b>Готово до імпорту:</b>\n\n`;
  message += `Статус: <b>${status}</b>\n\n`;

  items.forEach((item, index) => {
    message += `${index + 1}️⃣ ${item.name}\n`;
    if (item.serial) message += `   Серійний: ${item.serial}\n`;
    message += `   Кількість: ${item.quantity} ${item.unit}\n`;
    if (item.price) message += `   Ціна: ${item.price} грн\n`;
    message += '\n';
  });

  const keyboard = new InlineKeyboard()
    .text('✅ Підтвердити', `import_confirm_${status}`)
    .text('❌ Скасувати', 'import_cancel');

  await ctx.answerCallbackQuery();
  await ctx.editMessageText(message, {
    parse_mode: 'HTML',
    reply_markup: keyboard,
  });
}

export async function handleImportConfirm(ctx: Context) {
  const callbackData = ctx.callbackQuery?.data;
  const userId = ctx.from?.id;

  if (!userId || !callbackData) return;

  const items = userParsedItems.get(userId);
  if (!items || items.length === 0) {
    await ctx.answerCallbackQuery();
    await ctx.reply('❌ Розпізнані дані не знайдено. Надішліть документ заново.');
    return;
  }

  const status = callbackData.replace('import_confirm_', '');

  await ctx.answerCallbackQuery();
  await ctx.editMessageText('⏳ Імпортую МЦ на склад...', { parse_mode: 'HTML' });

  try {
    // Transform to API format
    const apiItems = items.map(item => ({
      name: item.name,
      status,
      quantity: item.quantity,
      unit: item.unit,
      description: item.notes || undefined,
      balance_status: 'off_balance' as const, // OCR documents are typically off-balance
    }));

    // Bulk import
    const result = await api.bulkCreateItems(apiItems);

    let message = `✅ <b>Імпорт завершено!</b>\n\n`;
    message += `✓ Успішно: ${result.success}\n`;
    if (result.failed > 0) {
      message += `✗ Помилки: ${result.failed}\n\n`;
      if (result.errors.length > 0) {
        message += `Деталі:\n${result.errors.slice(0, 5).join('\n')}`;
        if (result.errors.length > 5) {
          message += `\n... та ще ${result.errors.length - 5} помилок`;
        }
      }
    }

    // Clear stored items
    userParsedItems.delete(userId);

    await ctx.editMessageText(message, { parse_mode: 'HTML' });

  } catch (error: any) {
    console.error('Import error:', error);
    await ctx.editMessageText(
      `❌ Помилка імпорту: ${error.message || 'Невідома помилка'}`,
      { parse_mode: 'HTML' }
    );
  }
}

export async function handleImportCancel(ctx: Context) {
  const userId = ctx.from?.id;

  if (userId) {
    userParsedItems.delete(userId);
  }

  await ctx.answerCallbackQuery();
  await ctx.editMessageText('❌ Імпорт скасовано', { parse_mode: 'HTML' });
}
