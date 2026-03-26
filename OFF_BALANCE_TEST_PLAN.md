# Позабалансовий облік — План тестування

**Функціональність**: Off-Balance Accounting (позабалансовий облік МЦ)
**Дата**: 2026-03-25
**Статус**: Готовий до виконання

---

## Зміст

1. [Backend API Tests](#1-backend-api-tests)
2. [Role-Based Access Control Tests](#2-role-based-access-control-tests)
3. [Database / Migration Tests](#3-database--migration-tests)
4. [Frontend UI Tests](#4-frontend-ui-tests)
5. [Integration / E2E Scenarios](#5-integration--e2e-scenarios)
6. [Edge Cases & Regression Tests](#6-edge-cases--regression-tests)
7. [Test Data Setup](#7-test-data-setup)
8. [Test Execution Checklist](#8-test-execution-checklist)

---

## 1. Backend API Tests

> Базовий URL: `http://localhost:3000/api`
> Усі запити потребують заголовка `Authorization: Bearer <token>`, якщо не вказано інше.

---

### 1.1 POST /items — Створення МЦ з полем balance_status

#### Нотатка по реалізації
Поточний `createItem` (itemController.ts рядок 27) не приймає `balance_status` з body — поле береться з дефолтного значення сутності (`'off_balance'`). Тести нижче верифікують як поточну поведінку, так і очікувану після реалізації фічі.

---

**API-001** — Щасливий шлях: створення off_balance МЦ (менеджер)
- Method + URL: `POST /api/items`
- Role: manager
- Request body:
  ```json
  {
    "name": "Тепловізор TH-200",
    "status": "volunteer",
    "quantity": 1,
    "unit": "шт",
    "description": "Отримано без накладної"
  }
  ```
- Expected: `201 Created`
  ```json
  {
    "status": "success",
    "data": {
      "id": "<uuid>",
      "name": "Тепловізор TH-200",
      "balance_status": "off_balance",
      "document_number": null,
      "document_date": null,
      "supplier_name": null
    }
  }
  ```
- Verify: `balance_status` = `"off_balance"` у відповіді та в БД

---

**API-002** — Явне передання `balance_status: "off_balance"`
- Method + URL: `POST /api/items`
- Role: manager
- Request body:
  ```json
  {
    "name": "Бронежилет БЖ-1",
    "status": "government",
    "quantity": 5,
    "balance_status": "off_balance"
  }
  ```
- Expected: `201 Created`, `balance_status: "off_balance"`
- Note: Якщо поле ігнорується контролером — фіксувати як GAP

---

**API-003** — Передання `balance_status: "on_balance"` при створенні (менеджер)
- Method + URL: `POST /api/items`
- Role: manager
- Request body:
  ```json
  {
    "name": "Рація Motorola",
    "status": "volunteer",
    "quantity": 2,
    "balance_status": "on_balance",
    "document_number": "НН-2025-001",
    "document_date": "2026-03-20",
    "supplier_name": "ТОВ Постач"
  }
  ```
- Expected: Або `201` з `balance_status: "on_balance"` (якщо дозволено), або `403 Forbidden` (якщо менеджер не може ставити `on_balance`)
- Note: Уточнити у вимогах: чи може менеджер одразу ставити `on_balance`?

---

**API-004** — Відсутнє обов'язкове поле `name`
- Method + URL: `POST /api/items`
- Role: admin
- Request body: `{ "status": "volunteer", "quantity": 1 }`
- Expected: `400 Bad Request`
  ```json
  { "status": "error", "message": "..." }
  ```

---

**API-005** — Невалідне значення `balance_status`
- Method + URL: `POST /api/items`
- Role: admin
- Request body:
  ```json
  {
    "name": "Тест",
    "status": "volunteer",
    "balance_status": "unknown_status"
  }
  ```
- Expected: `400 Bad Request` з описом помилки валідації

---

### 1.2 GET /items?balance_status=off_balance — Фільтрація

**API-010** — Фільтр: лише off_balance МЦ
- Method + URL: `GET /api/items?balance_status=off_balance`
- Role: admin
- Expected: `200 OK`
  ```json
  {
    "status": "success",
    "data": [ /* лише items де balance_status = "off_balance" */ ],
    "pagination": { "page": 1, "limit": 20, "total": <N>, "pages": <P> }
  }
  ```
- Verify:
  - [ ] Кожен елемент у `data` має `balance_status: "off_balance"`
  - [ ] `total` відповідає кількості off_balance МЦ у БД
  - [ ] on_balance МЦ відсутні у відповіді

---

**API-011** — Фільтр: лише on_balance МЦ
- Method + URL: `GET /api/items?balance_status=on_balance`
- Role: admin
- Expected: `200 OK`, всі елементи мають `balance_status: "on_balance"`
- Verify:
  - [ ] `document_number` заповнений у кожного елемента (або null якщо тестові дані дозволяють)
  - [ ] off_balance МЦ відсутні

---

**API-012** — Без фільтру (повертає всі МЦ)
- Method + URL: `GET /api/items`
- Role: admin
- Expected: `200 OK`, містить і `off_balance` і `on_balance` МЦ
- Verify: сума `off_balance + on_balance` = `total` у pagination

---

**API-013** — Явний фільтр `balance_status=all`
- Method + URL: `GET /api/items?balance_status=all`
- Role: admin
- Expected: `200 OK` — те саме що без фільтру (або ігнорує параметр)
- Note: Поведінка залежить від реалізації. Якщо `"all"` не підтримується — очікується або ігнорування, або `400`

---

**API-014** — Комбінований фільтр: balance_status + пагінація
- Method + URL: `GET /api/items?balance_status=off_balance&page=2&limit=5`
- Role: admin
- Expected: `200 OK`, сторінка 2 з 5 елементів, усі `off_balance`
- Verify: `pagination.page = 2`, `pagination.limit = 5`

---

**API-015** — Менеджер бачить лише свої off_balance МЦ
- Method + URL: `GET /api/items?balance_status=off_balance`
- Role: manager (user_id = `<manager_id>`)
- Expected: `200 OK`, лише МЦ де `ownerId = <manager_id>` і `balance_status = "off_balance"`
- Verify: МЦ інших користувачів відсутні (поведінка відповідно до itemController.ts рядок 62)

---

**API-016** — Невалідне значення balance_status у фільтрі
- Method + URL: `GET /api/items?balance_status=invalid_value`
- Role: admin
- Expected: Або `400 Bad Request`, або повертає всі МЦ (ігнорує невалідний параметр)
- Note: Зафіксувати фактичну поведінку

---

### 1.3 PATCH /items/:id/transfer-to-balance — Переведення на баланс

> Цей endpoint ще не реалізований в item.routes.ts. Тести описують очікувану поведінку після імплементації.

**API-020** — Щасливий шлях: leader переводить off_balance → on_balance
- Method + URL: `PATCH /api/items/<off_balance_item_id>/transfer-to-balance`
- Role: leader
- Request body:
  ```json
  {
    "document_number": "НН-2026-042",
    "document_date": "2026-03-24",
    "supplier_name": "Фонд 'Повернись живим'"
  }
  ```
- Expected: `200 OK`
  ```json
  {
    "status": "success",
    "data": {
      "id": "<uuid>",
      "balance_status": "on_balance",
      "document_number": "НН-2026-042",
      "document_date": "2026-03-24",
      "supplier_name": "Фонд 'Повернись живим'"
    }
  }
  ```
- Verify:
  - [ ] `balance_status` змінений на `"on_balance"` у БД
  - [ ] `document_number`, `document_date`, `supplier_name` збережені
  - [ ] `updatedAt` оновлений
  - [ ] Операція переводу збережена в таблиці `operations`

---

**API-021** — Admin переводить off_balance → on_balance
- Method + URL: `PATCH /api/items/<off_balance_item_id>/transfer-to-balance`
- Role: admin
- Request body: (аналогічно API-020)
- Expected: `200 OK` — адмін має право переводити

---

**API-022** — Manager намагається перевести на баланс (заборонено)
- Method + URL: `PATCH /api/items/<off_balance_item_id>/transfer-to-balance`
- Role: manager
- Request body: (аналогічно API-020)
- Expected: `403 Forbidden`
  ```json
  {
    "status": "error",
    "message": "Insufficient permissions"
  }
  ```

---

**API-023** — Переведення: відсутнє поле `document_number`
- Method + URL: `PATCH /api/items/<id>/transfer-to-balance`
- Role: leader
- Request body:
  ```json
  {
    "document_date": "2026-03-24",
    "supplier_name": "Постач ТОВ"
  }
  ```
- Expected: `400 Bad Request`, валідаційна помилка про відсутній `document_number`

---

**API-024** — Переведення: відсутнє поле `document_date`
- Method + URL: `PATCH /api/items/<id>/transfer-to-balance`
- Role: leader
- Request body: `{ "document_number": "НН-001", "supplier_name": "Постач" }`
- Expected: `400 Bad Request`

---

**API-025** — Переведення: відсутнє поле `supplier_name`
- Method + URL: `PATCH /api/items/<id>/transfer-to-balance`
- Role: leader
- Request body: `{ "document_number": "НН-001", "document_date": "2026-03-24" }`
- Expected: `400 Bad Request` — або `200` якщо `supplier_name` необов'язковий (уточнити у вимогах)

---

**API-026** — Переведення МЦ яке не існує
- Method + URL: `PATCH /api/items/00000000-0000-0000-0000-000000000000/transfer-to-balance`
- Role: leader
- Expected: `404 Not Found`
  ```json
  { "status": "error", "message": "Item not found" }
  ```

---

**API-027** — Менеджер намагається перевести чуже МЦ (навіть якби мав права)
- Method + URL: `PATCH /api/items/<item_owned_by_other_user>/transfer-to-balance`
- Role: manager
- Expected: `403 Forbidden`

---

### 1.4 GET /reports/off-balance — Звіт по позабалансових МЦ

> Endpoint ще не реалізований у report.routes.ts. Тести описують очікувану поведінку.

**API-030** — Звіт: admin отримує список off_balance МЦ
- Method + URL: `GET /api/reports/off-balance`
- Role: admin
- Expected: `200 OK`
  ```json
  {
    "status": "success",
    "data": {
      "items": [
        {
          "id": "<uuid>",
          "name": "...",
          "quantity": 1,
          "balance_status": "off_balance",
          "owner": { "username": "..." },
          "createdAt": "..."
        }
      ],
      "summary": {
        "total_off_balance": 12,
        "oldest_item_date": "2026-01-15"
      }
    }
  }
  ```
- Verify:
  - [ ] Усі елементи мають `balance_status: "off_balance"`
  - [ ] Присутній `summary` з підсумками
  - [ ] Можливість отримати у форматах `?format=excel` та `?format=pdf`

---

**API-031** — Звіт: фільтр по даті очікування
- Method + URL: `GET /api/reports/off-balance?waiting_since=2026-01-01`
- Role: admin
- Expected: `200 OK`, лише МЦ додані з 2026-01-01 або раніше

---

**API-032** — Звіт: manager бачить лише свої off_balance МЦ
- Method + URL: `GET /api/reports/off-balance`
- Role: manager
- Expected: `200 OK`, лише МЦ поточного менеджера

---

**API-033** — Звіт: порожній результат
- Method + URL: `GET /api/reports/off-balance`
- Role: admin (в БД немає off_balance МЦ)
- Expected: `200 OK`
  ```json
  { "status": "success", "data": { "items": [], "summary": { "total_off_balance": 0 } } }
  ```

---

## 2. Role-Based Access Control Tests

### 2.1 Матриця дозволів

| Дія | admin | leader | manager | Неавторизований |
|-----|-------|--------|---------|-----------------|
| Створити off_balance МЦ | ✓ | ✓ | ✓ | 401 |
| Переглянути off_balance МЦ | ✓ (всі) | ✓ (всі) | ✓ (свої) | 401 |
| Перевести на баланс | ✓ | ✓ | 403 | 401 |
| Переглянути звіт off-balance | ✓ | ✓ | ✓ (свої) | 401 |

---

**RBAC-001** — Manager успішно створює off_balance МЦ
- Дія: `POST /api/items` з role=manager
- Expected: `201 Created`, `balance_status: "off_balance"`
- Status: ✓ Дозволено

---

**RBAC-002** — Manager намагається виконати transfer-to-balance
- Дія: `PATCH /api/items/<id>/transfer-to-balance` з role=manager
- Expected: `403 Forbidden`, `message: "Insufficient permissions"`
- Status: ✗ Заборонено

---

**RBAC-003** — Leader успішно переводить МЦ на баланс
- Дія: `PATCH /api/items/<id>/transfer-to-balance` з role=leader
- Expected: `200 OK`
- Status: ✓ Дозволено

---

**RBAC-004** — Admin успішно переводить МЦ на баланс
- Дія: `PATCH /api/items/<id>/transfer-to-balance` з role=admin
- Expected: `200 OK`
- Status: ✓ Дозволено

---

**RBAC-005** — Запит без токена (unauthenticated)
- Дія: `GET /api/items?balance_status=off_balance` без `Authorization` заголовка
- Expected: `401 Unauthorized`
  ```json
  { "status": "error", "message": "Authentication required" }
  ```

---

**RBAC-006** — Запит з невалідним (підробленим) токеном
- Дія: `GET /api/items` з `Authorization: Bearer invalid.token.here`
- Expected: `401 Unauthorized`
  ```json
  { "status": "error", "message": "Invalid or expired token" }
  ```

---

**RBAC-007** — Запит з відкликаним токеном
- Pre-condition: Виконати `POST /api/auth/logout` для відкликання токена
- Дія: Використати той же токен для `GET /api/items`
- Expected: `401 Unauthorized`
  ```json
  { "status": "error", "message": "Token has been revoked" }
  ```

---

**RBAC-008** — Manager не може бачити off_balance МЦ іншого менеджера
- Pre-condition: МЦ створено manager_A; запит виконує manager_B
- Дія: `GET /api/items?balance_status=off_balance` з токеном manager_B
- Expected: `200 OK`, МЦ manager_A відсутні у відповіді
- Note: Згідно itemController.ts рядок 62 — manager бачить лише `where.ownerId = userId`

---

**RBAC-009** — Manager намагається перевести чуже МЦ (подвійна перевірка)
- Pre-condition: off_balance МЦ створено manager_A; запит від manager_B
- Дія: `PATCH /api/items/<manager_A_item_id>/transfer-to-balance` з токеном manager_B
- Expected: `403 Forbidden` (спрацьовує або role-check або owner-check)

---

## 3. Database / Migration Tests

### 3.1 Перевірка схеми після міграції

**DB-001** — Міграція виконується без помилок
- Дія: Запустити `npm run migration:run` на чистій БД
- Expected: Виконання без помилок; у логах рядки `migration executed`
- Verify: `SELECT * FROM migrations ORDER BY timestamp DESC LIMIT 5;` — нова міграція присутня

---

**DB-002** — Усі 4 нові колонки присутні в таблиці `items`
- SQL:
  ```sql
  SELECT column_name, data_type, column_default, is_nullable
  FROM information_schema.columns
  WHERE table_name = 'items'
    AND column_name IN ('balance_status', 'document_number', 'document_date', 'supplier_name')
  ORDER BY column_name;
  ```
- Expected:

  | column_name | data_type | column_default | is_nullable |
  |-------------|-----------|----------------|-------------|
  | balance_status | character varying | 'off_balance' | NO |
  | document_date | date | (null) | YES |
  | document_number | character varying | (null) | YES |
  | supplier_name | character varying | (null) | YES |

---

**DB-003** — Довжини колонок відповідають вимогам
- SQL:
  ```sql
  SELECT column_name, character_maximum_length
  FROM information_schema.columns
  WHERE table_name = 'items'
    AND column_name IN ('balance_status', 'document_number', 'supplier_name');
  ```
- Expected:
  - `balance_status`: 20
  - `document_number`: 50
  - `supplier_name`: 255
- Note: Відповідає `Item.ts` — `varchar(20)`, `varchar(50)`, `varchar(255)`

---

**DB-004** — DEFAULT 'off_balance' застосовується до нових записів
- SQL:
  ```sql
  INSERT INTO items (name, status, quantity, owner_id)
  VALUES ('Test Item', 'volunteer', 1, '<valid_user_id>')
  RETURNING balance_status;
  ```
- Expected: `balance_status = 'off_balance'`

---

**DB-005** — DEFAULT 'off_balance' застосовується до існуючих записів після міграції
- Pre-condition: В БД є МЦ, що були створені ДО міграції (без `balance_status`)
- SQL:
  ```sql
  SELECT COUNT(*) FROM items WHERE balance_status IS NULL;
  ```
- Expected: `0` — жодного NULL значення; усі старі записи отримали `'off_balance'`

---

**DB-006** — NULL значення в документних полях дозволені
- SQL:
  ```sql
  INSERT INTO items (name, status, quantity, owner_id, balance_status)
  VALUES ('No Docs Item', 'volunteer', 1, '<valid_user_id>', 'off_balance')
  RETURNING document_number, document_date, supplier_name;
  ```
- Expected: Всі три поля `= NULL` — без помилок constraint

---

**DB-007** — Відкат міграції (rollback) не ламає БД
- Дія: Запустити `npm run migration:revert`
- Expected: Чотири колонки видалені, таблиця `items` повертається до попереднього стану
- Verify:
  ```sql
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'items' AND column_name = 'balance_status';
  ```
  Expected: 0 рядків

---

**DB-008** — Індекс на `balance_status` (якщо передбачений)
- SQL:
  ```sql
  SELECT indexname FROM pg_indexes
  WHERE tablename = 'items' AND indexdef LIKE '%balance_status%';
  ```
- Expected: Присутній індекс (для продуктивності фільтрації)
- Note: Якщо індексу немає — зафіксувати як потенційний performance issue

---

## 4. Frontend UI Tests

> Середовище: Electron-додаток, запущений через `npm start` у frontend/
> Тестові ролі: admin, leader, manager (окремі тестові акаунти)

---

### 4.1 Dashboard — Лічильник позабалансових МЦ

**UI-001** — Dashboard показує лічильник off_balance МЦ
- Pre-condition: В БД є 5 off_balance МЦ
- Дія: Відкрити Dashboard будь-якою роллю
- Expected:
  - [ ] Наявна картка/блок "Позабаланс: 5 шт" (або аналогічний)
  - [ ] Значення відповідає фактичній кількості off_balance МЦ в БД
- Note: Поточний DashboardScreen.tsx не має такого лічильника — це GAP до реалізації

---

**UI-002** — Лічильник оновлюється після переведення МЦ на баланс
- Pre-condition: Dashboard відкрито, лічильник показує 5
- Дія: В іншому вікні/вкладці виконати transfer-to-balance для 1 МЦ; повернутись на Dashboard і оновити
- Expected: Лічильник показує 4
- Verify: Оновлення відбувається після refresh/re-fetch, не потребує перезапуску

---

**UI-003** — Лічильник = 0 коли немає off_balance МЦ
- Pre-condition: Всі МЦ переведені на баланс
- Дія: Відкрити Dashboard
- Expected: Лічильник показує 0 (або картка відсутня/прихована)

---

### 4.2 Items List — Фільтри балансу

**UI-010** — Фільтр "Всі" показує всі МЦ
- Pre-condition: В БД є 3 off_balance і 4 on_balance МЦ (всього 7)
- Дія: Відкрити ItemsListScreen, обрати фільтр "Всі"
- Expected:
  - [ ] Показано 7 МЦ
  - [ ] Присутні і off_balance, і on_balance позиції
  - [ ] Лічильник "7 позицій" у заголовку картки

---

**UI-011** — Фільтр "На балансі" показує лише on_balance МЦ
- Дія: Обрати фільтр "На балансі"
- Expected:
  - [ ] Показано лише on_balance МЦ
  - [ ] Кількість = 4 (з прикладу вище)
  - [ ] off_balance МЦ відсутні в таблиці
  - [ ] Кнопка фільтру "На балансі" підсвічена (active state)

---

**UI-012** — Фільтр "Позабаланс" показує лише off_balance МЦ
- Дія: Обрати фільтр "Позабаланс"
- Expected:
  - [ ] Показано лише off_balance МЦ
  - [ ] Кількість = 3
  - [ ] on_balance МЦ відсутні

---

**UI-013** — Іконка ⚠️ для off_balance МЦ в таблиці
- Дія: Відкрити список зі змішаними МЦ
- Expected:
  - [ ] Поряд з кожним off_balance МЦ відображається іконка ⚠️ (або аналогічний індикатор)
  - [ ] Поряд з on_balance МЦ відображається іконка 📄
  - [ ] Іконки мають tooltip/підказку при наведенні

---

**UI-014** — Кнопка "Оформити документи" видима для off_balance МЦ (leader/admin)
- Pre-condition: Ввійти як leader або admin
- Дія: Відкрити список МЦ, знайти off_balance позицію
- Expected:
  - [ ] Кнопка "Оформити документи" присутня для кожного off_balance МЦ
  - [ ] Кнопка відсутня для on_balance МЦ

---

**UI-015** — Кнопка "Оформити документи" НЕ видима для менеджера
- Pre-condition: Ввійти як manager
- Дія: Відкрити список МЦ
- Expected:
  - [ ] Кнопка "Оформити документи" відсутня (прихована)
  - [ ] off_balance МЦ видимі, але без кнопки переведення

---

**UI-016** — Нова позиція завжди додається як off_balance
- Pre-condition: Ввійти як manager
- Дія: Натиснути "Додати позицію" → заповнити форму без документів → зберегти
- Expected:
  - [ ] Нова позиція з'являється у списку з `balance_status: "off_balance"`
  - [ ] Іконка ⚠️ відображається для нової позиції
  - [ ] Форма не містить поля для документів (або вони приховані)

---

### 4.3 Форма "Оформлення документів"

**UI-020** — Відкриття форми реєстрації документів
- Pre-condition: leader або admin; є off_balance МЦ
- Дія: Клікнути "Оформити документи" на off_balance позиції
- Expected:
  - [ ] Відкривається модальне вікно або нова форма
  - [ ] Форма містить поля: "Номер накладної", "Дата накладної", "Постачальник/Донор"
  - [ ] Кнопка "Перевести на баланс" присутня
  - [ ] Кнопка "Скасувати" / закрити присутня

---

**UI-021** — Валідація: порожній номер накладної
- Дія: Залишити "Номер накладної" порожнім → натиснути "Перевести на баланс"
- Expected:
  - [ ] Форма не відправляється
  - [ ] Відображається повідомлення про помилку під полем
  - [ ] API-запит не виконується

---

**UI-022** — Валідація: порожня дата накладної
- Дія: Залишити "Дата накладної" порожньою → Submit
- Expected: Помилка валідації, форма не відправляється

---

**UI-023** — Валідація: порожнє ім'я постачальника (якщо обов'язкове)
- Дія: Залишити "Постачальник" порожнім → Submit
- Expected: Якщо обов'язкове — помилка валідації; якщо необов'язкове — форма відправляється
- Note: Уточнити у вимогах

---

**UI-024** — Успішне переведення через форму
- Pre-condition: Форма відкрита, всі поля заповнені коректно
- Дія: Натиснути "Перевести на баланс"
- Expected:
  - [ ] Форма закривається
  - [ ] Toast/сповіщення "МЦ переведено на баланс"
  - [ ] МЦ зникає з фільтру "Позабаланс"
  - [ ] МЦ з'являється у фільтрі "На балансі"
  - [ ] Іконка МЦ змінюється з ⚠️ на 📄

---

**UI-025** — Форма зберігає введені дані при помилці API
- Pre-condition: Симулювати помилку API (відключити backend)
- Дія: Заповнити форму → Submit → отримати помилку
- Expected:
  - [ ] Відображається повідомлення про помилку
  - [ ] Введені дані НЕ очищуються (користувач може повторити)
  - [ ] Кнопка "Перевести на баланс" знову активна

---

### 4.4 Sync Status (офлайн режим)

**UI-030** — Відображення off_balance МЦ в офлайн режимі
- Pre-condition: Відключити мережу; в локальному кеші є off_balance МЦ
- Дія: Відкрити ItemsListScreen
- Expected:
  - [ ] Показано "Офлайн" індикатор (WifiOff іконка)
  - [ ] off_balance МЦ відображаються з локального кешу
  - [ ] Кількість "очікують синхронізації" відображається

---

## 5. Integration / E2E Scenarios

### 5.1 Повний цикл: від надходження до балансу

**E2E-001** — Повний workflow: МЦ без документів → на баланс

**Кроки:**

1. **[Manager] Реєстрація МЦ без документів**
   - `POST /api/items`
     ```json
     { "name": "Дрон DJI Mavic 3", "status": "volunteer", "quantity": 2, "unit": "шт" }
     ```
   - Expected: `201`, `balance_status: "off_balance"`, `item_id` збережено

2. **[Manager] Перевірка у списку**
   - `GET /api/items?balance_status=off_balance`
   - Expected: Новий дрон присутній у списку

3. **[Admin] Перегляд звіту off-balance**
   - `GET /api/reports/off-balance`
   - Expected: Дрон присутній у звіті

4. **[Leader] Документи прийшли — реєстрація накладної**
   - `PATCH /api/items/<drone_id>/transfer-to-balance`
     ```json
     {
       "document_number": "НН-2026-099",
       "document_date": "2026-03-25",
       "supplier_name": "Charitable Fund Ukraine"
     }
     ```
   - Expected: `200`, `balance_status: "on_balance"`

5. **[Admin] Перевірка у фільтрах**
   - `GET /api/items?balance_status=off_balance` → дрон відсутній
   - `GET /api/items?balance_status=on_balance` → дрон присутній з документами

6. **[Admin] Перевірка звіту після переведення**
   - `GET /api/reports/off-balance`
   - Expected: Дрон відсутній у off-balance звіті

7. **[UI] Перевірка на Dashboard**
   - Лічильник off-balance зменшився на 2 (кількість одиниць)

---

**E2E-002** — Bulk scenario: кілька МЦ очікують документи

**Кроки:**

1. Manager реєструє 5 різних МЦ без документів протягом тижня
2. Admin перевіряє `GET /api/reports/off-balance?waiting_since=<7_days_ago>`
3. Документи прийшли — Leader переводить 3 з 5 МЦ на баланс
4. Verify:
   - `GET /api/items?balance_status=off_balance` → 2 МЦ
   - `GET /api/items?balance_status=on_balance` → 3 МЦ (+ всі попередні)
   - Dashboard лічильник = 2

---

**E2E-003** — Паралельна робота: manager додає МЦ, leader одночасно переводить інше

**Кроки:**

1. Leader виконує `PATCH .../transfer-to-balance` для МЦ-A
2. Одночасно Manager виконує `POST /api/items` для нового МЦ-B
3. Verify:
   - МЦ-A переведено успішно
   - МЦ-B додано як off_balance
   - Дані не переплутались

---

## 6. Edge Cases & Regression Tests

**EDGE-001** — Переведення вже-on_balance МЦ (повторний transfer)
- Pre-condition: МЦ вже має `balance_status: "on_balance"`
- Дія: `PATCH /api/items/<on_balance_id>/transfer-to-balance`
  ```json
  { "document_number": "НН-NEW", "document_date": "2026-03-25", "supplier_name": "Test" }
  ```
- Expected: Або `400 Bad Request` ("МЦ вже на балансі"), або ідемпотентна відповідь `200` з незміненими даними
- Note: Поведінку слід чітко визначити у вимогах та задокументувати

---

**EDGE-002** — Порожній `document_number` (пробіли)
- Дія: `PATCH .../transfer-to-balance` з `"document_number": "   "` (лише пробіли)
- Expected: `400 Bad Request` — серверна валідація має відхилити рядки з лише пробілами (аналогічно до `name.trim()` в createItem)

---

**EDGE-003** — `document_number` довший за 50 символів
- Дія: Передати `document_number` з 51 символом
- Expected: `400 Bad Request` (відповідно до `varchar(50)` у Item.ts)

---

**EDGE-004** — `supplier_name` довший за 255 символів
- Дія: Передати `supplier_name` з 256 символами
- Expected: `400 Bad Request` (відповідно до `varchar(255)` у Item.ts)

---

**EDGE-005** — `document_date` у майбутньому
- Дія: `PATCH .../transfer-to-balance` з `document_date: "2099-12-31"`
- Expected:
  - Варіант A: `400 Bad Request` з попередженням "Дата не може бути в майбутньому"
  - Варіант B: `200 OK` але з попередженням у відповіді (якщо майбутні дати допускаються)
- Note: Уточнити у бізнес-вимогах

---

**EDGE-006** — `document_date` некоректного формату
- Дія: Передати `document_date: "25-03-2026"` (DD-MM-YYYY замість YYYY-MM-DD)
- Expected: `400 Bad Request` — валідація формату дати

---

**EDGE-007** — МЦ з `balance_status` у sync_queue (офлайн режим)
- Pre-condition: Додати off_balance МЦ в офлайн режимі; МЦ потрапляє в `sync_queue` з `status: "pending"`
- Дія: Відновити з'єднання; синхронізація виконується
- Expected:
  - [ ] МЦ з'являється на сервері з `balance_status: "off_balance"`
  - [ ] `sync_queue` запис переходить у `status: "completed"`
  - [ ] Конфлікт не виникає якщо сервер не змінював цей МЦ

---

**EDGE-008** — Конфлікт синхронізації: офлайн-зміна vs серверна зміна balance_status
- Pre-condition:
  1. Manager редагує МЦ офлайн (змінює `name`)
  2. Тим часом Leader переводить той самий МЦ на баланс на сервері
- Дія: Manager виходить онлайн; синхронізація виконується
- Expected:
  - [ ] Конфлікт `balance_status` виявлено та відображено у UI
  - [ ] Користувач бачить: локальне значення vs серверне значення
  - [ ] Клік "Вирішити" зберігає серверне значення `on_balance` (сервер-wins стратегія)

---

**EDGE-009** — Існуючі МЦ без balance_status (legacy дані)
- Pre-condition: Дані з БД до міграції (якщо є тестове середовище pre-migration)
- SQL перевірка:
  ```sql
  SELECT COUNT(*) FROM items WHERE balance_status IS NULL;
  ```
- Expected: `0` — migration DEFAULT забезпечує відсутність NULL
- Дія: `GET /api/items?balance_status=off_balance`
- Expected: Legacy МЦ присутні у фільтрі `off_balance` (відповідно до DEFAULT)

---

**EDGE-010** — Soft-deleted МЦ не з'являються у off_balance фільтрі
- Pre-condition: Виконати `DELETE /api/items/<off_balance_id>` (soft delete)
- Дія: `GET /api/items?balance_status=off_balance`
- Expected: Видалений МЦ відсутній у результатах
- Note: itemController.ts рядок 61 вже має `where.isDeleted = false`

---

**EDGE-011** — Великий обсяг off_balance МЦ (performance)
- Pre-condition: Створити 1000+ off_balance МЦ
- Дія: `GET /api/items?balance_status=off_balance&page=1&limit=20`
- Expected:
  - [ ] Відповідь < 500ms
  - [ ] Пагінація коректна (`total` = 1000+, `pages` відповідне)
  - [ ] Немає N+1 запитів до БД

---

### 6.1 Regression: Існуючі функції не зламані

**REG-001** — Пошук за назвою МЦ працює разом з balance_status фільтром
- Дія: (якщо фільтр реалізовано на frontend) Ввести пошук "Дрон" + обрати фільтр "Позабаланс"
- Expected: Показані лише МЦ з назвою "Дрон" і `balance_status: "off_balance"`

---

**REG-002** — Пагінація МЦ не зламана після додавання balance_status полів
- Дія: `GET /api/items?page=2&limit=5`
- Expected: `200 OK`, коректна пагінація (як до змін)
- Verify: Структура відповіді `{ status, data, pagination }` незмінна

---

**REG-003** — Existing inventory report не зламаний
- Дія: `GET /api/reports/inventory`
- Expected: `200 OK`, дані не змінились
- Note: balance_status не повинен впливати на поточний inventory report

---

**REG-004** — Створення МЦ без `balance_status` у body (backward compat)
- Дія: `POST /api/items` без поля `balance_status`
- Expected: `201 Created`, `balance_status: "off_balance"` за замовчуванням
- Verify: Існуючий frontend-код, що не передає `balance_status`, продовжує працювати

---

**REG-005** — Donor linkage для off_balance МЦ
- Дія: `PUT /api/items/<off_balance_id>/donor` → прив'язати донора
- Expected: `200 OK`, `donorId` оновлено, `balance_status` залишається `off_balance`

---

## 7. Test Data Setup

### 7.1 Тестові акаунти

```sql
-- Перевірити/створити тестових користувачів (пароль: Test1234!)
SELECT id, email, role FROM users
WHERE email IN ('admin@test.bf', 'leader@test.bf', 'manager_a@test.bf', 'manager_b@test.bf');
```

```http
# Якщо не існують — створити через API
POST /api/auth/register
{ "email": "admin@test.bf",     "password": "Test1234!", "fullName": "Тест Адмін",     "role": "admin"   }
POST /api/auth/register
{ "email": "leader@test.bf",    "password": "Test1234!", "fullName": "Тест Лідер",    "role": "leader"  }
POST /api/auth/register
{ "email": "manager_a@test.bf", "password": "Test1234!", "fullName": "Менеджер А",    "role": "manager" }
POST /api/auth/register
{ "email": "manager_b@test.bf", "password": "Test1234!", "fullName": "Менеджер Б",    "role": "manager" }
```

### 7.2 Тестові МЦ

```http
# Отримати токен для manager_a
POST /api/auth/login
{ "email": "manager_a@test.bf", "password": "Test1234!" }
# -> зберегти TOKEN_MANAGER_A

# Створити off_balance МЦ (5 штук)
POST /api/items  Authorization: Bearer TOKEN_MANAGER_A
{ "name": "Тепловізор TH-200",    "status": "volunteer", "quantity": 1, "unit": "шт" }
{ "name": "Бронежилет БЖ-5",      "status": "government","quantity": 3, "unit": "шт" }
{ "name": "Рація Motorola XT-2",  "status": "volunteer", "quantity": 2, "unit": "шт" }
{ "name": "Дрон DJI Mavic 3T",    "status": "volunteer", "quantity": 1, "unit": "шт" }
{ "name": "Медичний набір МН-1",  "status": "government","quantity": 10,"unit": "шт" }

# Отримати токен для leader
POST /api/auth/login
{ "email": "leader@test.bf", "password": "Test1234!" }
# -> зберегти TOKEN_LEADER

# Перевести 2 МЦ на баланс (щоб були обидва типи)
PATCH /api/items/<thermal_id>/transfer-to-balance  Authorization: Bearer TOKEN_LEADER
{ "document_number": "НН-2026-001", "document_date": "2026-03-20", "supplier_name": "Фонд Повернись Живим" }

PATCH /api/items/<bz_id>/transfer-to-balance  Authorization: Bearer TOKEN_LEADER
{ "document_number": "НН-2026-002", "document_date": "2026-03-22", "supplier_name": "Державний резерв" }
```

### 7.3 SQL seed-скрипт (альтернативно)

```sql
-- Встановити UUID extension якщо відсутня
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Seed off_balance МЦ
DO $$
DECLARE
  manager_id UUID;
BEGIN
  SELECT id INTO manager_id FROM users WHERE email = 'manager_a@test.bf';

  INSERT INTO items (id, name, status, quantity, unit, owner_id, balance_status, is_deleted, version)
  VALUES
    (uuid_generate_v4(), 'Тепловізор TH-200',   'volunteer', 1,  'шт', manager_id, 'off_balance', false, 1),
    (uuid_generate_v4(), 'Рація Motorola XT-2',  'volunteer', 2,  'шт', manager_id, 'off_balance', false, 1),
    (uuid_generate_v4(), 'Дрон DJI Mavic 3T',   'volunteer', 1,  'шт', manager_id, 'off_balance', false, 1);

  INSERT INTO items (id, name, status, quantity, unit, owner_id, balance_status,
                     document_number, document_date, supplier_name, is_deleted, version)
  VALUES
    (uuid_generate_v4(), 'Бронежилет БЖ-5', 'government', 3, 'шт', manager_id, 'on_balance',
     'НН-2026-001', '2026-03-20', 'Державний резерв', false, 1),
    (uuid_generate_v4(), 'Аптечка АТ-3',    'government', 5, 'шт', manager_id, 'on_balance',
     'НН-2026-002', '2026-03-22', 'Медичний фонд',    false, 1);
END $$;
```

### 7.4 Отримання токенів для тестування

```bash
# Зберегти токени у змінні середовища для Postman/curl
export TOKEN_ADMIN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.bf","password":"Test1234!"}' | jq -r '.data.accessToken')

export TOKEN_LEADER=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"leader@test.bf","password":"Test1234!"}' | jq -r '.data.accessToken')

export TOKEN_MANAGER=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"manager_a@test.bf","password":"Test1234!"}' | jq -r '.data.accessToken')
```

---

## 8. Test Execution Checklist

### Підготовка середовища
- [ ] Backend запущено: `cd backend && npm run dev` (порт 3000)
- [ ] Frontend запущено: `cd frontend && npm start`
- [ ] PostgreSQL доступна та міграції виконані: `npm run migration:run`
- [ ] Тестові акаунти створені (розділ 7.1)
- [ ] Тестові МЦ засіяні в БД (розділ 7.2 або 7.3)
- [ ] Postman/Insomnia налаштовано з токенами (розділ 7.4)

### Фаза 1: Database & Migration (DB-001 – DB-008)
- [ ] DB-001 Міграція без помилок
- [ ] DB-002 Всі 4 колонки присутні
- [ ] DB-003 Довжини колонок коректні
- [ ] DB-004 DEFAULT для нових записів
- [ ] DB-005 DEFAULT для існуючих записів
- [ ] DB-006 NULL дозволені в документних полях
- [ ] DB-007 Rollback працює
- [ ] DB-008 Індекс на balance_status

### Фаза 2: Backend API — Happy Path (API-001, API-010, API-011, API-020, API-021, API-030)
- [ ] API-001 Створення off_balance МЦ
- [ ] API-010 Фільтр off_balance
- [ ] API-011 Фільтр on_balance
- [ ] API-012 Без фільтру — всі МЦ
- [ ] API-020 Transfer-to-balance (leader)
- [ ] API-021 Transfer-to-balance (admin)
- [ ] API-030 Off-balance report

### Фаза 3: RBAC Tests (RBAC-001 – RBAC-009)
- [ ] RBAC-002 Manager заборонено transfer-to-balance (403)
- [ ] RBAC-005 Без токена — 401
- [ ] RBAC-006 Невалідний токен — 401
- [ ] RBAC-007 Відкликаний токен — 401
- [ ] RBAC-008 Manager бачить лише свої МЦ

### Фаза 4: Backend API — Error Cases (API-003 – API-006, API-022 – API-027, API-031 – API-033)
- [ ] API-022 Manager transfer → 403
- [ ] API-023 Transfer без document_number → 400
- [ ] API-024 Transfer без document_date → 400
- [ ] API-026 Transfer неіснуючого МЦ → 404

### Фаза 5: Frontend UI Tests (UI-001 – UI-025)
- [ ] UI-001 Dashboard off_balance лічильник
- [ ] UI-002 Лічильник оновлюється
- [ ] UI-010 Фільтр "Всі"
- [ ] UI-011 Фільтр "На балансі"
- [ ] UI-012 Фільтр "Позабаланс"
- [ ] UI-013 Іконки ⚠️ / 📄
- [ ] UI-014 Кнопка "Оформити документи" для leader/admin
- [ ] UI-015 Кнопка прихована для manager
- [ ] UI-016 Нова позиція = off_balance
- [ ] UI-020 Форма реєстрації документів відкривається
- [ ] UI-021 Валідація порожній document_number
- [ ] UI-024 Успішне переведення через UI

### Фаза 6: Edge Cases & Regression (EDGE-001 – EDGE-011, REG-001 – REG-005)
- [ ] EDGE-001 Повторний transfer вже on_balance МЦ
- [ ] EDGE-002 document_number з пробілів
- [ ] EDGE-005 document_date у майбутньому
- [ ] EDGE-007 Офлайн sync для off_balance МЦ
- [ ] EDGE-009 Legacy МЦ без balance_status
- [ ] EDGE-011 Performance при 1000+ off_balance МЦ
- [ ] REG-002 Пагінація не зламана
- [ ] REG-003 Inventory report не зламаний
- [ ] REG-004 Backward compat без balance_status у body

### Фаза 7: E2E Scenarios (E2E-001 – E2E-003)
- [ ] E2E-001 Повний цикл off_balance → on_balance
- [ ] E2E-002 Bulk scenario (5 МЦ)
- [ ] E2E-003 Паралельні операції

---

### Критерії прийняття (Sign-off Criteria)

- [ ] Всі API happy path тести пройшли (API-001, API-010, API-011, API-020, API-021)
- [ ] RBAC перевірки виконані (RBAC-002, RBAC-005, RBAC-006 — критичні)
- [ ] DB міграція не порушила існуючі дані
- [ ] E2E-001 (повний цикл) пройшов успішно
- [ ] Жодної регресії у existing endpoints (REG-001 – REG-005)
- [ ] UI фільтри та форма документів працюють коректно

---

### GAPs / Відкриті питання

| # | Питання | Пріоритет |
|---|---------|-----------|
| G-1 | `PATCH /items/:id/transfer-to-balance` endpoint відсутній у routes — потребує реалізації | Критичний |
| G-2 | `GET /reports/off-balance` endpoint відсутній у report.routes.ts — потребує реалізації | Критичний |
| G-3 | `createItem` в itemController.ts не приймає `balance_status` з body — чи є це навмисним? | Середній |
| G-4 | Dashboard не має лічильника off_balance МЦ — потребує реалізації | Середній |
| G-5 | ItemsListScreen не має фільтру "На балансі / Позабаланс" — поточні фільтри лише "Державне/Волонтерське" | Критичний |
| G-6 | Валідатор `validateCreateItem` не включає `balance_status` — потребує оновлення | Середній |
| G-7 | Чи є `supplier_name` обов'язковим при transfer? Уточнити у вимогах | Низький |
| G-8 | Що відбувається при повторному transfer вже-on_balance МЦ? Потребує рішення | Середній |

---

*Тест-план створено на основі аналізу: `backend/src/entities/Item.ts`, `backend/src/controllers/itemController.ts`, `backend/src/routes/item.routes.ts`, `frontend/src/renderer/screens/ItemsListScreen.tsx`, `frontend/src/renderer/screens/DashboardScreen.tsx`, `OFF_BALANCE_REQUIREMENTS.md`*
