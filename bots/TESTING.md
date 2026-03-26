# Тестування Telegram Ботів

## Import Bot (@BlackF_import_bot)

### Запуск

```bash
cd ~/black-falcon/bots/import-bot
npm start
```

### Тестування в Telegram

1. Знайдіть бота: [@BlackF_import_bot](https://t.me/BlackF_import_bot)
2. Відправте `/start`
3. Отримайте шаблон: `/template`
4. Заповніть Excel файл
5. Відправте файл через `/import_excel`

### Тестові сценарії

#### ✅ Успішний імпорт (off_balance)
```
Назва: Палатка туристична
Категорія: Туристичне спорядження
Кількість: 5
Одиниця виміру: шт
Опис: Двомісна палатка
Статус балансу: off_balance
```

#### ✅ Успішний імпорт (on_balance)
```
Назва: Ноутбук Dell
Категорія: Електроніка
Кількість: 2
Одиниця виміру: шт
Опис: Dell Latitude
Статус балансу: on_balance
Номер документа: ВН-001234
Дата документа: 2026-03-15
Постачальник: ТОВ "Електросвіт"
```

#### ❌ Валідація: відсутня назва
```
Назва: (порожньо)
Категорія: Електроніка
```
**Очікуваний результат:** Помилка валідації

#### ❌ Валідація: on_balance без документів
```
Назва: Ноутбук
Статус балансу: on_balance
Номер документа: (порожньо)
```
**Очікуваний результат:** Помилка валідації

### Перевірка результатів

```bash
# Перевірка в базі даних
psql -U contfactory -d black_falcon_dev -c "
SELECT name, quantity, balance_status, document_number 
FROM items 
ORDER BY created_at DESC 
LIMIT 10;
"
```

### Зупинка бота

```bash
# Знайдіть процес
ps aux | grep "tsx src/bot.ts"

# Зупиніть
kill <PID>
```

## API Credentials

**Користувач для ботів:**
- Email: `import_bot@blackfalcon.ua`
- Пароль: `BotImport2026`

**Отримання токена:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"import_bot@blackfalcon.ua","password":"BotImport2026"}' | jq -r '.accessToken'
```

## Статус розробки

- ✅ Import Bot — MVP готовий
- 🔄 Manager Bot — в розробці
- ⏳ Reports Bot — в розробці
