import { Context } from 'grammy';
import * as XLSX from 'xlsx';
import axios from 'axios';
import { api } from '../api.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

interface ExcelRow {
  'Назва'?: string;
  'Категорія'?: string;
  'Кількість'?: number;
  'Одиниця виміру'?: string;
  'Опис'?: string;
  'Статус балансу'?: string;
  'Номер документа'?: string;
  'Дата документа'?: string;
  'Постачальник'?: string;
}

export async function handleImportCommand(ctx: Context) {
  await ctx.reply(
    '📎 Надішліть Excel файл (.xlsx) з матеріальними цінностями\n\n' +
    '📋 Формат таблиці:\n' +
    '• Назва (обов\'язково)\n' +
    '• Категорія (необов\'язково)\n' +
    '• Кількість (за замовчанням: 1)\n' +
    '• Одиниця виміру (необов\'язково)\n' +
    '• Опис (необов\'язково)\n' +
    '• Статус балансу (on_balance / off_balance, за замовчанням: off_balance)\n' +
    '• Номер документа (для on_balance)\n' +
    '• Дата документа (для on_balance)\n' +
    '• Постачальник (для on_balance)\n\n' +
    'Отримати шаблон: /template'
  );
}

export async function handleDocumentUpload(ctx: Context) {
  const doc = ctx.message?.document;
  
  if (!doc) {
    await ctx.reply('❌ Файл не знайдено');
    return;
  }

  const fileName = doc.file_name || '';
  if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
    await ctx.reply('❌ Підтримуються тільки файли Excel (.xlsx, .xls)');
    return;
  }

  await ctx.reply('⏳ Завантажую та обробляю файл...');

  try {
    // Download file from Telegram
    const file = await ctx.api.getFile(doc.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${ctx.api.token}/${file.file_path}`;
    
    const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data);

    // Parse Excel
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data: ExcelRow[] = XLSX.utils.sheet_to_json(sheet);

    if (data.length === 0) {
      await ctx.reply('❌ Файл порожній або не містить даних');
      return;
    }

    // Validate and transform data
    const items = data
      .map((row, index) => {
        const name = row['Назва']?.toString().trim();
        if (!name) {
          return { error: `Рядок ${index + 2}: відсутня назва` };
        }

        const balanceStatus = row['Статус балансу']?.toString().toLowerCase();
        const isOnBalance = balanceStatus === 'on_balance' || balanceStatus === 'на балансі';

        // Validation for on_balance items
        if (isOnBalance) {
          if (!row['Номер документа']) {
            return { error: `Рядок ${index + 2}: для "на балансі" потрібен номер документа` };
          }
          if (!row['Дата документа']) {
            return { error: `Рядок ${index + 2}: для "на балансі" потрібна дата документа` };
          }
          if (!row['Постачальник']) {
            return { error: `Рядок ${index + 2}: для "на балансі" потрібен постачальник` };
          }
        }

        return {
          name,
          quantity: row['Кількість'] ? Number(row['Кількість']) : 1,
          unit: row['Одиниця виміру']?.toString().trim() || null,
          description: row['Опис']?.toString().trim() || null,
          balance_status: isOnBalance ? 'on_balance' : 'off_balance',
          document_number: row['Номер документа']?.toString().trim() || null,
          document_date: row['Дата документа'] ? formatDate(row['Дата документа']) : null,
          supplier_name: row['Постачальник']?.toString().trim() || null,
        };
      })
      .filter(item => !('error' in item));

    const errors = data
      .map((row, index) => {
        const name = row['Назва']?.toString().trim();
        if (!name) return `Рядок ${index + 2}: відсутня назва`;
        return null;
      })
      .filter(Boolean) as string[];

    if (errors.length > 0) {
      await ctx.reply('⚠️ Виявлено помилки валідації:\n' + errors.join('\n'));
      if (items.length === 0) return;
    }

    await ctx.reply(`📊 Знайдено ${items.length} записів. Імпортую...`);

    // Bulk import
    const result = await api.bulkCreateItems(items as any[]);

    let message = `✅ Імпорт завершено!\n\n`;
    message += `✓ Успішно: ${result.success}\n`;
    if (result.failed > 0) {
      message += `✗ Помилки: ${result.failed}\n\n`;
      if (result.errors.length > 0) {
        message += `Деталі помилок:\n${result.errors.slice(0, 10).join('\n')}`;
        if (result.errors.length > 10) {
          message += `\n... та ще ${result.errors.length - 10} помилок`;
        }
      }
    }

    await ctx.reply(message);

  } catch (error: any) {
    console.error('Import error:', error);
    await ctx.reply(`❌ Помилка імпорту: ${error.message || 'Невідома помилка'}`);
  }
}

function formatDate(value: any): string | null {
  if (!value) return null;
  
  // If Excel date number
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
  }
  
  // If string date
  if (typeof value === 'string') {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }
  
  return null;
}
