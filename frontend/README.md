# Frontend Service

**Frontend Service** — пользовательский веб-интерфейс банковской системы.  
Приложение построено на **React + TypeScript + Vite**, работает через **API Gateway** и предоставляет единый UI для операций с аккаунтами, счетами, депозитами и уведомлениями.

Во frontend применена production-структура: разделены UI-слой, API-клиент и DTO-контракты, синхронизированные с backend-сервисами.

---

## 🚀 Основной функционал

* Управление аккаунтами:
    * создание
    * получение по ID
    * обновление
    * удаление
* Управление счетами:
    * получение по ID
    * получение списка по accountId
    * создание одного или нескольких счетов
    * обновление
    * пополнение
    * удаление
* Работа с депозитами:
    * создание депозита
    * получение депозита по ID
* Отправка уведомлений о депозите
* Централизованный вывод результата последнего запроса и ошибок API

---

## 🧩 Архитектура

### Основные слои

* **features/** — UI-компоненты и сценарии экранов
    * `accounts`, `bills`, `deposits`
* **api/core/** — общий HTTP-клиент, конфиг, маппер ошибок
* **api/modules/** — доменные API-модули:
    * `accounts.api.ts`
    * `bills.api.ts`
    * `deposits.api.ts`
    * `notifications.api.ts`
* **dto/request/** — request DTO
* **dto/response/** — response DTO
* **shared/** — общие утилиты (валидация/парсинг форм)

---

## 📦 DTO-контракты

TypeScript DTO повторяют backend-контракты из:

* `common-lib`
* `account-service`

Используются те же имена и поля (`AccountRequestDTO`, `BillRequestDTO`, `DepositRequestDTO`, `AccountResponseDTO`, `BillResponseDTO`, `ErrorResponseDTO` и др.), что упрощает поддержку и снижает риск рассинхронизации API.

---

## 🌍 Интеграция с API Gateway

По умолчанию frontend отправляет запросы в:

```text
http://localhost:8989
```

URL можно переопределить через `.env`:

```env
VITE_GATEWAY_URL=http://localhost:8989
```

---

## 🧱 Структура проекта

```text
frontend
 ├── public
 ├── src
 │    ├── api
 │    │    ├── core
 │    │    └── modules
 │    ├── dto
 │    │    ├── request
 │    │    └── response
 │    ├── features
 │    │    ├── accounts
 │    │    ├── bills
 │    │    ├── deposits
 │    │    └── common
 │    ├── shared
 │    ├── App.tsx
 │    └── main.tsx
 ├── nginx.conf
 ├── Dockerfile
 └── package.json
```

---

## 🧪 Проверка качества

```bash
cd frontend
npm run lint
npm run build
```

---

## 🚦 Локальный запуск

```bash
cd frontend
npm install
npm run dev
```

Приложение доступно по адресу:

```text
http://localhost:5173
```

---

## 🐳 Docker

Frontend подключен в корневом `docker-compose.yml`.

```bash
docker-compose up -d --build frontend
```

После запуска UI доступен по адресу:

```text
http://localhost:3000
```

---

## 🧰 Используемые технологии

* React 19
* TypeScript 5
* Vite 8
* Axios
* ESLint
* Docker + Nginx

---
