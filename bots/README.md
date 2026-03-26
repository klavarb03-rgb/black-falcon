# Black Falcon Telegram Bots

Три Telegram боти для роботи з системою Black Falcon МЦ.

## 🤖 Боти

### 1. Import Bot (@BlackF_import_bot)
**Токен:** `8721484853:AAEd3KuvUaagW-XNUm-_4qnAtqH4gTPCCw8`

📥 Імпорт матеріальних цінностей через Excel/CSV файли.

**Основні функції:**
- Завантаження Excel з МЦ
- Генерація шаблону Excel
- Валідація даних
- Bulk import через API

[Детальна документація](./import-bot/README.md)

---

### 2. Manager Bot (@Black_Flc_Boss_bot)
**Токен:** `8722386379:AAG8v4UAD-K9xUEZf5Ba8I4XTpE_My-1AJg`

👨‍💼 Операції керівника з матеріальними цінностями.

**Основні функції:**
- Перегляд списку МЦ
- Пошук за назвою/описом
- Фільтрація (на балансі / позабаланс)
- Статистика системи

[Детальна документація](./manager-bot/README.md)

---

### 3. Reports Bot (@Report_BlcF_bot)
**Токен:** `8607586167:AAFWPQvXrCHDG27DO1lbjn_-2x4c7rISXgw`

📊 Автоматичні звіти та алерти.

**Основні функції:**
- Щоденні звіти (09:00)
- Тижневі звіти (понеділок 10:00)
- Звіти на вимогу
- Настроювані графіки

[Детальна документація](./reports-bot/README.md)

---

## 🚀 Швидкий старт

### Встановлення всіх ботів

```bash
cd ~/black-falcon/bots

# Import Bot
cd import-bot && npm install && cd ..

# Manager Bot
cd manager-bot && npm install && cd ..

# Reports Bot
cd reports-bot && npm install && cd ..
```

### Конфігурація

Кожен бот потребує `.env` файл з:

```env
BOT_TOKEN=<bot_token>
API_URL=http://localhost:3000
API_TOKEN=<jwt_token>
```

**Отримання JWT токена:**

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"import_bot@blackfalcon.ua","password":"BotImport2026"}' \
  | jq -r '.accessToken'
```

### Запуск

**Всі боти одночасно (tmux):**

```bash
# Створити tmux сесію
tmux new-session -d -s bots

# Import Bot
tmux new-window -t bots -n import "cd ~/black-falcon/bots/import-bot && npm start"

# Manager Bot
tmux new-window -t bots -n manager "cd ~/black-falcon/bots/manager-bot && npm start"

# Reports Bot
tmux new-window -t bots -n reports "cd ~/black-falcon/bots/reports-bot && npm start"

# Підключитись до сесії
tmux attach -t bots
```

**Окремо:**

```bash
# Import Bot
cd import-bot && npm start

# Manager Bot
cd manager-bot && npm start

# Reports Bot
cd reports-bot && npm start
```

---

## 📋 API Credentials

**Користувач для ботів:**
- Email: `import_bot@blackfalcon.ua`
- Пароль: `BotImport2026`
- Роль: `admin`

**Створення користувача (SQL):**

```sql
INSERT INTO users (email, password_hash, name, role, is_active) 
VALUES (
  'import_bot@blackfalcon.ua',
  '$2b$12$/VDnOV/OvJoNRtHiYpUHE.f1VjdVxyo9jj7qD3U/GmAtYC6HbgFC2',
  'Import Bot',
  'admin',
  true
);
```

---

## 🧪 Тестування

Див. [TESTING.md](./TESTING.md) для детальних тестових сценаріїв.

---

## 📊 Статус розробки

| Бот | Статус | Версія | Функції |
|-----|--------|--------|---------|
| Import Bot | ✅ MVP готовий | 1.0.0 | Excel import, шаблон, валідація |
| Manager Bot | ✅ MVP готовий | 1.0.0 | List, search, stats, фільтри |
| Reports Bot | ✅ MVP готовий | 1.0.0 | Daily/weekly reports, cron |

---

## 🛠 Технології

- **Grammy** - Telegram Bot Framework
- **TypeScript** - Типізація
- **axios** - HTTP client
- **xlsx** - Excel parsing (Import Bot)
- **node-cron** - Scheduled tasks (Reports Bot)

---

## 📝 TODO (майбутні функції)

### Import Bot
- [ ] CSV імпорт
- [ ] Валідація дублікатів
- [ ] Прогрес-бар імпорту
- [ ] Експорт даних в Excel

### Manager Bot
- [ ] Додавання нових МЦ через бота
- [ ] Редагування існуючих МЦ
- [ ] Трансфер на баланс
- [ ] Операції списання

### Reports Bot
- [ ] Налаштування графіків через бота
- [ ] Експорт звітів в PDF
- [ ] Алерти про критичні події
- [ ] Інтеграція з Google Sheets

---

## 👤 Автор

Black Falcon Team  
Контакт: @Roman_Bir_ua

---

## 📄 Ліцензія

ISC
