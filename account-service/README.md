# Account Service

**Account Service** — это микросервис, отвечающий за управление учётными записями пользователей в банковской системе.  
Он предоставляет REST-API для CRUD-операций над аккаунтами, публикует доменные события, взаимодействует с `bill-service` через RabbitMQ и использует Liquibase для миграций.

---

## 🚀 Основной функционал

- Создание аккаунта с последующей генерацией связанных счетов (через событие)
- Получение детальной информации об аккаунте
- Обновление данных аккаунта
- Удаление аккаунта с каскадным удалением счетов (через событие)
- Валидация входящих данных
- Асинхронная обработка событий
- Защита от дубликатов email
- Чистые REST-эндпоинты

---

## 🧩 Архитектура

### Слои
- **Controller** — REST API и валидация (`AccountController`)
- **Service** — бизнес-логика (`AccountServiceImpl`)
- **Repository** — работа с БД через Spring Data JPA
- **Entity** — модель таблицы accounts
- **Event Handler** — обрабатывает доменные события:
    - `AccountCreatedEvent` → создаёт счета через RabbitMQ command
    - `AccountDeletedEvent` → удаляет счета по accountId
- **Integration**:
    - RabbitMQ (AMQP)
    - `BillCommandGateway`
    - Spring Cloud Discovery
    - Spring Retry
    - Liquibase миграции

---

## 📦 Конфигурация

Сервис использует:
- Spring Cloud Config
- PostgreSQL
- Liquibase
- RabbitMQ listeners/publishers
- Eureka Discovery Client
- Async + Retry

Фрагмент `application.yml`:

```yaml
spring:
  application:
    name: account-service
  config:
    import: "configserver:http://${SPRING_SECURITY_USER}:${SPRING_SECURITY_PASSWORD}@config-service:8001"
  cloud:
    config:
      fail-fast: true
```

---

## 🗄 Liquibase миграции

База создаётся через файл:

`db/changelog/changes/001-create-accounts-table.xml`

Основное:

```xml
<createTable tableName="accounts">
    <column name="account_id" type="BIGSERIAL">
        <constraints primaryKey="true" nullable="false"/>
    </column>
    <column name="name" type="VARCHAR(63)" />
    <column name="email" type="VARCHAR(127)">
        <constraints nullable="false" unique="true"/>
    </column>
    <column name="phone" type="VARCHAR(20)" />
    <column name="creation_date" type="TIMESTAMPTZ" />
</createTable>
```

---

## 📘 REST API

### 🔹 Получить аккаунт
```
GET /accounts/{accountId}
```

**Response:**
```json
{
  "name": "John",
  "email": "john@test.com",
  "phone": "+123456789",
  "creationDate": "2025-01-01T12:00:00Z"
}
```

---

### 🔹 Создать аккаунт
```
POST /accounts
```

**Request:**
```json
{
  "name": "John",
  "email": "john@test.com",
  "phone": "+123456789",
  "bills": [
    { "amount": 100.00, "isDefault": true }
  ]
}
```

**Response:**
```json
1
```

📌 **Плюс:**  
Сразу после коммита публикуется `AccountCreatedEvent`, который отправляет команду создания счетов в `bill-service` через RabbitMQ.

---

### 🔹 Обновить аккаунт
```
PUT /accounts/{accountId}
```

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@test.com",
  "phone": "+123456789"
}
```

---

### 🔹 Удалить аккаунт
```
DELETE /accounts/{accountId}
```

Событие `AccountDeletedEvent` запускает удаление всех счетов в `bill-service`.

---

## 🔔 Доменные события

### AccountCreatedEvent
Отправляется после успешного создания.

```java
new AccountCreatedEvent(accountId, bills)
```

Хендлер вызывает:

```java
billCommandGateway.createBillsForAccount(accountId, bills)
```

### AccountDeletedEvent
Отправляется после удаления.

```java
billCommandGateway.deleteBillsByAccountId(accountId)
```

---

## 🧪 Тестирование

В проекте есть:

### ✔ Unit-тесты:
- **Controller**: валидация, ответы, mock сервиса
- **Service**: ошибки, события, правила уникальности
- **Repository**: JPA-маппинг, уникальность email

### ✔ Интеграционные тесты:
- поднятие контекста Spring Boot
- реальный PostgreSQL через testcontainers (EnablePostgresTestConfiguration)
- mock для BillCommandGateway
- проверка:
    - сохранения в БД
    - отправки RabbitMQ-команд
    - обработки событий
    - Liquibase миграций

---

## 🧱 Структура проекта

```
account-service
 ├── controller
 │    ├── AccountController.java
 │    └── dto/...
 ├── service
 │    ├── AccountService.java
 │    └── AccountServiceImpl.java
 ├── handler
 │    ├── AccountEventHandler.java
 │    └── event/*.java
 ├── repository
 │    └── AccountRepository.java
 ├── entity
 │    └── Account.java
 ├── test (unit + integration)
 ├── resources/db/changelog
 │    └── 001-create-accounts-table.xml
 └── AccountApplication.java
```

---

## 🔧 Запуск

### 1. Собрать:
```
mvn clean install
```

### 2. Запустить:
```
java -jar account-service.jar
```

Сервис автоматически зарегистрируется в Eureka и подтянет конфигурацию из config-service.

---

## 📡 Взаимодействие с другими сервисами

### bill-service
Через RabbitMQ команды:

- `bill.account.created`
- `bill.account.deleted`

Команды выполняются **асинхронно** и обрабатываются `bill-service` listener-ами.

---

## 📜 Ошибки и обработка

Глобальный обработчик (`GlobalExceptionHandler`) возвращает структурированные ответы:

- `404 Not Found` — аккаунт не найден
- `409 Conflict` — email уже существует
- `400 Bad Request` — неверная валидация

Пример ошибки:

```json
{
  "message": "Account with email: john@test.com already exists",
  "timestamp": "2025-01-10T13:12:00Z"
}
```

---

## 🧰 Используемые технологии

- Java 17
- Spring Boot 3.5.6
- Spring Cloud (Eureka, Config)
- RabbitMQ (AMQP)
- PostgreSQL
- Liquibase
- JPA / Hibernate
- Mockito / Testcontainers / MockMvc
- Lombok

---
