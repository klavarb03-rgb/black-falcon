# Black Falcon Import Bot

Telegram бот для імпорту матеріальних цінностей через Excel файли.

## Функції

- 📥 Імпорт МЦ з Excel (.xlsx)
- 📋 Генерація шаблону Excel
- ✅ Валідація даних
- 🔄 Автоматичне створення записів через Black Falcon API

## Встановлення

```bash
cd ~/black-falcon/bots/import-bot
npm install
```

## Конфігурація

Створіть `.env` файл:

```env
BOT_TOKEN=8721484853:AAEd3KuvUaagW-XNUm-_4qnAtqH4gTPCCw8
API_URL=http://localhost:3000
API_TOKEN=<your_admin_jwt_token>
```

## Запуск

```bash
npm start        # Production
npm run dev      # Development (watch mode)
```

## Команди бота

- `/start` - Привітання та інструкції
- `/import_excel` - Завантажити Excel файл
- `/template` - Отримати шаблон Excel
- `/help` - Довідка

## Формат Excel

| Назва | Категорія | Кількість | Одиниця виміру | Опис | Статус балансу | Номер документа | Дата документа | Постачальник |
|-------|-----------|-----------|----------------|------|----------------|-----------------|----------------|--------------|
| Палатка | Туристичне | 5 | шт | Двомісна | off_balance | | | |
| Ноутбук | Електроніка | 2 | шт | Dell i5 | on_balance | ВН-001 | 2026-03-15 | ТОВ "Світ" |

**Важливо:**
- Назва - обов'язкове поле
- Для `on_balance` обов'язкові: Номер документа, Дата документа, Постачальник

## Розробка

```bash
npm run build    # Компіляція TypeScript
npm run lint     # Перевірка коду
```

## Технології

- Grammy (Telegram Bot Framework)
- TypeScript
- xlsx (Excel parsing)
- axios (HTTP client)

## Автор

Black Falcon Team (@Roman_Bir_ua)

## Версія

1.0.0-MVP
