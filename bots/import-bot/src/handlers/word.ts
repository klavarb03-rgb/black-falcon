import { Context } from 'grammy';
import axios from 'axios';
import mammoth from 'mammoth';
import { ollama, ParsedItem } from '../services/ollama.js';
import { showItemsPreview } from './ocr.js';

export async function handleWordDocument(ctx: Context) {
  const doc = ctx.message?.document;
  
  if (!doc) {
    await ctx.reply('❌ Файл не знайдено');
    return;
  }

  const fileName = doc.file_name || '';
  const isWord = fileName.toLowerCase().endsWith('.docx') || fileName.toLowerCase().endsWith('.doc');
  const isTxt = fileName.toLowerCase().endsWith('.txt');
  
  if (!isWord && !isTxt) {
    return; // Not a Word/text document, skip
  }

  await ctx.reply('⏳ Обробляю Word документ...');

  try {
    // Download file from Telegram
    const file = await ctx.api.getFile(doc.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${ctx.api.token}/${file.file_path}`;
    
    const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data);

    let text: string;

    if (isTxt) {
      // Plain text file
      text = buffer.toString('utf-8');
    } else {
      // Word document - extract text using mammoth
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    }

    if (!text || text.trim().length === 0) {
      await ctx.reply('❌ Документ порожній або не містить тексту');
      return;
    }

    // Parse with Ollama Text model
    const result = await ollama.parseTextDocument(text);

    if (!result.items || result.items.length === 0) {
      await ctx.reply('❌ Не вдалося розпізнати жодного МЦ з документа.');
      return;
    }

    // Store parsed items (using shared function from ocr.ts)
    const userId = ctx.from?.id;
    if (userId) {
      // Import userParsedItems from ocr.ts
      const { userParsedItems } = await import('./ocr.js');
      userParsedItems.set(userId, result.items);
    }

    // Show preview (using shared function)
    await showItemsPreview(ctx, result.items);

  } catch (error: any) {
    console.error('Word document parsing error:', error);
    await ctx.reply(`❌ Помилка обробки Word документа: ${error.message || 'Невідома помилка'}`);
  }
}
