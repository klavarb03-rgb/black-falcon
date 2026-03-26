# Black Falcon Reports Bot

Telegram бот для автоматичних звітів та алертів.

## Функції

- 📊 Щоденні автоматичні звіти (09:00)
- 📈 Тижневі звіти (понеділок 10:00)
- 📋 Звіти на вимогу
- ⏰ Настроювані графіки через node-cron

## Встановлення

```bash
cd ~/black-falcon/bots/reports-bot
npm install
```

## Конфігурація

Створіть `.env` файл:

```env
BOT_TOKEN=8607586167:AAFWPQvXrCHDG27DO1lbjn_-2x4c7rISXgw
API_URL=http://localhost:3000
API_TOKEN=<your_jwt_token>
ADMIN_CHAT_ID=<your_telegram_chat_id>
```

**Як отримати chat_id:**
1. Запустіть бота: `npm start`
2. Відкрийте [@Report_BlcF_bot](https://t.me/Report_BlcF_bot)
3. Надішліть команду `/set_chat_id`
4. Скопіюйте chat_id в .env
5. Перезапустіть бота

## Запуск

```bash
npm start        # Production
npm run dev      # Development
```

## Команди бота

- `/start` - Привітання
- `/report_daily` - Отримати щоденний звіт
- `/report_weekly` - Отримати тижневий звіт
- `/set_chat_id` - Дізнатись свій chat_id
- `/help` - Довідка

## Автоматичні звіти

Якщо встановлено `ADMIN_CHAT_ID`, бот автоматично надсилає:

- **Щоденний звіт:** 09:00 (Kyiv timezone)
  - Всього МЦ
  - На балансі
  - Позабаланс

- **Тижневий звіт:** Понеділок 10:00 (Kyiv timezone)
  - Загальна статистика
  - Останні операції

## Налаштування розкладу

Редагуйте `src/scheduler.ts`:

```typescript
// Щоденний о 09:00
cron.schedule('0 9 * * *', async () => { ... });

// Тижневий понеділок о 10:00
cron.schedule('0 10 * * 1', async () => { ... });
```

Формат cron: `секунда хвилина година день_місяця місяць день_тижня`

## Технології

- Grammy (Telegram Bot Framework)
- node-cron (Scheduled tasks)
- TypeScript
- axios (HTTP client)

## Автор

Black Falcon Team (@Roman_Bir_ua)

## Версія

1.0.0-MVP
