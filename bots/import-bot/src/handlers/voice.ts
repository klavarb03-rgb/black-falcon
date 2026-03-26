import { Context } from 'grammy';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { whisper } from '../services/whisper.js';
import { ollama } from '../services/ollama.js';

interface VoiceQuery {
  query_type: 'count' | 'list' | 'report' | 'unknown';
  group_name?: string;
  manager_name?: string;
  item_name?: string;
  raw_text: string;
}

const VOICE_QUERY_PROMPT = `You are a voice command parser for inventory management system.

Your task: parse user voice command and extract structured query.

Query types:
- count: "Скільки [items] у [manager]?"
- list: "Список [items] у [manager]"
- report: "Звіт по [group/manager]"
- unknown: can't determine intent

Output format: JSON
{
  "query_type": "count" | "list" | "report" | "unknown",
  "group_name": "optional group/category name",
  "manager_name": "optional manager name",
  "item_name": "optional specific item name",
  "raw_text": "original transcribed text"
}

Examples:

Input: "Скільки антибіотиків у менеджера Івана?"
Output:
{
  "query_type": "count",
  "group_name": "Антибіотики",
  "manager_name": "Іван",
  "raw_text": "Скільки антибіотиків у менеджера Івана?"
}

Input: "Список моніторів у Олега"
Output:
{
  "query_type": "list",
  "group_name": "Монітори",
  "manager_name": "Олег",
  "raw_text": "Список моніторів у Олега"
}

Input: "Звіт по складу"
Output:
{
  "query_type": "report",
  "raw_text": "Звіт по складу"
}

Now parse this voice command:

{TEXT}

Return JSON only.`;

export async function handleVoiceMessage(ctx: Context) {
  const voice = ctx.message?.voice;
  
  if (!voice) {
    await ctx.reply('❌ Голосове повідомлення не знайдено');
    return;
  }

  await ctx.reply('🎤 Обробляю голосове повідомлення...');

  let tempFilePath: string | null = null;

  try {
    // Download voice file from Telegram
    const file = await ctx.api.getFile(voice.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${ctx.api.token}/${file.file_path}`;
    
    const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data);

    // Save to temp file (Whisper needs file path)
    const tempDir = os.tmpdir();
    tempFilePath = path.join(tempDir, `voice_${Date.now()}.ogg`);
    await fs.writeFile(tempFilePath, buffer);

    // Transcribe with Whisper
    const transcription = await whisper.transcribe(tempFilePath, 'uk');
    const transcribedText = transcription.text.trim();

    if (!transcribedText) {
      await ctx.reply('❌ Не вдалося розпізнати голос. Спробуйте ще раз.');
      return;
    }

    await ctx.reply(`📝 Розпізнано: "${transcribedText}"\n\n⏳ Обробляю запит...`);

    // Parse query with Ollama
    const prompt = VOICE_QUERY_PROMPT.replace('{TEXT}', transcribedText);
    const queryResponse = await ollama.parseTextDocument(prompt);

    // Extract query from response
    // Since parseTextDocument expects items[], we need to use raw API
    // For now, send a simple acknowledgment
    await ctx.reply(
      `✅ Голосовий запит прийнято!\n\n` +
      `📝 Текст: ${transcribedText}\n\n` +
      `⚠️ Функція голосових запитів ще розробляється.\n` +
      `Поки що використовуйте звичайні команди боту.`
    );

  } catch (error: any) {
    console.error('Voice processing error:', error);
    await ctx.reply(`❌ Помилка обробки голосу: ${error.message || 'Невідома помилка'}`);
  } finally {
    // Clean up temp file
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}
