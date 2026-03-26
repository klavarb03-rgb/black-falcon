# Black Falcon Manager Bot

Telegram бот для операцій керівника з матеріальними цінностями.

## Функції

- 📋 Перегляд списку МЦ (всі / на балансі / позабаланс)
- 🔍 Пошук за назвою та описом
- 📊 Статистика системи
- ✅ Фільтрація за статусом балансу

## Встановлення

```bash
cd ~/black-falcon/bots/manager-bot
npm install
```

## Конфігурація

Створіть `.env` файл:

```env
BOT_TOKEN=8722386379:AAG8v4UAD-K9xUEZf5Ba8I4XTpE_My-1AJg
API_URL=http://localhost:3000
API_TOKEN=<your_jwt_token>
```

## Запуск

```bash
npm start        # Production
npm run dev      # Development
```

## Команди бота

- `/start` - Привітання
- `/list` - Показати всі МЦ
- `/list_on_balance` - МЦ на балансі
- `/list_off_balance` - МЦ позабаланс
- `/search [запит]` - Пошук МЦ
- `/stats` - Статистика системи
- `/help` - Довідка

## Приклади використання

```
/list                      → Показати всі МЦ
/search палатка            → Знайти всі палатки
/list_on_balance           → Показати тільки балансові МЦ
/stats                     → Статистика системи
```

## Технології

- Grammy (Telegram Bot Framework)
- TypeScript
- axios (HTTP client)

## Автор

Black Falcon Team (@Roman_Bir_ua)

## Версія

1.0.0-MVP
