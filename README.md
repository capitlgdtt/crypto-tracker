# Crypto Tracker API

Backend-сервис для отслеживания и агрегации цен криптовалют через CoinMarketCap API.

Сервис предоставляет REST API для управления списком отслеживаемых криптовалют, получения актуальных и исторических цен, а также выполняет фоновую синхронизацию с CoinMarketCap. Написан на TypeScript поверх Express и SQLite.

## Возможности

- Аутентификация по Bearer-токену для всех `/api/*` эндпоинтов
- CRUD для отслеживаемых криптовалют
- Актуальные цены и история цен
- Фоновая синхронизация цен с CoinMarketCap
- Ручной запуск синхронизации
- Таймауты и обработка ошибок внешнего API
- OpenAPI 3.0 спецификация и Swagger UI
- Корректное завершение по SIGINT / SIGTERM
- Юнит- и интеграционные тесты на Jest + Supertest
- Docker и docker-compose

## Стек

- Node.js 18+
- Express.js
- TypeScript
- SQLite через `better-sqlite3`
- Jest + Supertest
- Swagger (OpenAPI 3.0)
- axios

## Требования

- Node.js 18 или новее
- npm
- API-ключ CoinMarketCap: https://coinmarketcap.com/api/

## Локальный запуск

1. Установить зависимости:

   ```
   npm install
   ```

2. Создать `.env` в корне проекта (см. `.env.example`):

   ```
   NODE_ENV=development
   PORT=3000
   API_KEY=change-me
   CMC_API_KEY=your-coinmarketcap-api-key
   CMC_BASE_URL=https://pro-api.coinmarketcap.com
   CMC_TIMEOUT_MS=10000
   DEFAULT_CURRENCY=USD
   SYNC_INTERVAL_MS=60000
   DB_PATH=./data/crypto.sqlite
   ```

3. Запустить в режиме разработки:

   ```
   npm run dev
   ```

   Сервер поднимется на `http://localhost:3000`.

## Скрипты

| Скрипт | Описание |
| --- | --- |
| `npm run dev` | Запуск в watch-режиме через nodemon и ts-node |
| `npm run build` | Компиляция TypeScript в `dist/` |
| `npm start` | Запуск собранного сервера |
| `npm test` | Запуск Jest-тестов |
| `npm run test:watch` | Jest в watch-режиме |
| `npm run typecheck` | Проверка типов без эмита |

## Обзор API

Все `/api/*` эндпоинты требуют заголовок `Authorization: Bearer <API_KEY>`, где `API_KEY` - значение из `.env`.

| Метод | Путь | Описание |
| --- | --- | --- |
| GET | `/health` | Health check (без авторизации) |
| GET | `/api/cryptocurrencies` | Список отслеживаемых криптовалют |
| POST | `/api/cryptocurrencies` | Добавить криптовалюту |
| GET | `/api/cryptocurrencies/:id` | Получить одну криптовалюту |
| PATCH | `/api/cryptocurrencies/:id` | Обновить криптовалюту |
| DELETE | `/api/cryptocurrencies/:id` | Удалить криптовалюту (вместе с историей) |
| GET | `/api/cryptocurrencies/:id/prices` | История цен (`from`, `to`, `limit`, `offset`) |
| GET | `/api/prices/latest` | Последние цены (`symbols` - опциональный фильтр) |
| POST | `/api/sync` | Ручной запуск синхронизации |
| GET | `/openapi.json` | OpenAPI 3.0 спецификация |
| GET | `/api-docs` | Swagger UI |

Полная документация доступна на `/api-docs` после запуска сервера.

### Пример запроса

```
curl -X POST http://localhost:3000/api/cryptocurrencies \
-H "Authorization: Bearer change-me" \
-H "Content-Type: application/json" \
-d '{"symbol":"BTC","name":"Bitcoin"}'
```

## Фоновая синхронизация

Scheduler вызывает `syncService.syncOnce()` каждые `SYNC_INTERVAL_MS` миллисекунд. Для каждой отслеживаемой криптовалюты он получает актуальную цену в настроенной валюте, сохраняет новую запись в `price_history` и обновляет `last_updated_at` у криптовалюты.

Ошибки внешнего API логируются, но не роняют процесс. При остановке scheduler дожидается завершения текущего цикла.

## Docker

Сборка и запуск через docker-compose:

```
docker compose up --build
```

Сервис слушает `http://localhost:3000`. База SQLite хранится в именованном volume (`crypto-data`), поэтому переживает перезапуски контейнера. Чтобы начать с чистой БД:

```
docker compose down -v
```

Переменные окружения читаются из `.env` в корне проекта.

## Тесты

```
npm test
```

Тесты работают с in-memory SQLite (`:memory:`), поэтому состояние между тестами не разделяется и ничего не пишется на диск. Внешние API-вызовы замоканы.

## Структура проекта

```
src/
├── config/              Конфигурация из переменных окружения
├── db/                  Подключение к SQLite и миграции
├── docs/                OpenAPI-спецификация и роутер документации
├── middleware/          Auth-мидлварь
├── modules/
│   ├── cryptocurrencies/  Модуль CRUD
│   ├── prices/            История цен и последние цены
│   └── sync/              Ручной запуск синхронизации
├── services/
│   ├── coinmarketcap.ts   HTTP-клиент CoinMarketCap
│   ├── scheduler.ts       Фоновый планировщик
│   └── syncService.ts     Логика синхронизации
├── utils/               Ошибки, валидаторы, async handler
├── app.ts               Express-приложение
└── index.ts             Точка входа
```

## Замечания

- `better-sqlite3` используется строго как драйвер SQLite. Все запросы - raw SQL, ORM нет.
- API-ключ CoinMarketCap и API-ключ сервиса не хранятся в коде и не отдаются клиенту.
- Все внешние HTTP-запросы имеют таймаут (`CMC_TIMEOUT_MS`).
