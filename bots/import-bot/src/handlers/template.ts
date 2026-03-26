import { Context } from 'grammy';
import * as XLSX from 'xlsx';
import { InputFile } from 'grammy';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export async function handleTemplateCommand(ctx: Context) {
  try {
    // Create template workbook
    const workbook = XLSX.utils.book_new();
    
    const templateData = [
      {
        'Назва': 'Палатка туристична (приклад)',
        'Категорія': 'Туристичне спорядження',
        'Кількість': 5,
        'Одиниця виміру': 'шт',
        'Опис': 'Двомісна палатка для польових умов',
        'Статус балансу': 'off_balance',
        'Номер документа': '',
        'Дата документа': '',
        'Постачальник': '',
      },
      {
        'Назва': 'Ноутбук Dell Latitude (приклад)',
        'Категорія': 'Електроніка',
        'Кількість': 2,
        'Одиниця виміру': 'шт',
        'Опис': '15.6" FHD, Intel i5, 16GB RAM',
        'Статус балансу': 'on_balance',
        'Номер документа': 'ВН-001234',
        'Дата документа': '2026-03-15',
        'Постачальник': 'ТОВ "Електросвіт"',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 30 }, // Назва
      { wch: 25 }, // Категорія
      { wch: 10 }, // Кількість
      { wch: 15 }, // Одиниця виміру
      { wch: 35 }, // Опис
      { wch: 15 }, // Статус балансу
      { wch: 18 }, // Номер документа
      { wch: 15 }, // Дата документа
      { wch: 25 }, // Постачальник
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'МЦ для імпорту');

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Send file
    await ctx.replyWithDocument(
      new InputFile(buffer, 'black_falcon_template.xlsx'),
      {
        caption: 
          '📋 Шаблон для імпорту МЦ\n\n' +
          '✏️ Заповніть таблицю своїми даними:\n' +
          '• Назва - обов\'язково\n' +
          '• Категорія - необов\'язково\n' +
          '• Кількість - за замовчанням 1\n' +
          '• Статус балансу: "on_balance" або "off_balance"\n\n' +
          '⚠️ Для матеріалів на балансі (on_balance) обов\'язково:\n' +
          '• Номер документа\n' +
          '• Дата документа (формат: YYYY-MM-DD)\n' +
          '• Постачальник\n\n' +
          '📤 Після заповнення надішліть файл назад боту командою /import_excel'
      }
    );

  } catch (error: any) {
    console.error('Template generation error:', error);
    await ctx.reply(`❌ Помилка генерації шаблону: ${error.message}`);
  }
}
