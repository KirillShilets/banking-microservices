# Bill Service

**Bill Service** — микросервис, отвечающий за управление банковскими счетами (bills).
Он предоставляет REST-API для CRUD-операций над счетами, выполняет операции депозита, публикует доменные события и интегрируется с `account-service`, `deposit-service` и `notification-service` через Feign-клиентов и Spring Events.

---

## 🚀 Основной функционал

* Создание одного или нескольких биллов для аккаунта
* Получение билла по ID и списка по accountId
* Обновление данных билла
* Депозит средств на счёт с многоуровневой валидацией
* Удаление билла или всех биллов аккаунта
* Генерация событий:

    * `DepositEvent` → Deposit Service
    * `NotificationEvent` → Notification Service
* Проверка email владельца билла через Account Service
* Асинхронная обработка событий
* Валидация DTO
* Поддержка overdraft-режима

---

## 🧩 Архитектура

### Слои

* **Controller** — REST API и внешняя валидация (`BillController`)
* **Service** — бизнес-логика (`BillServiceImpl`)
* **Repository** — доступ к данным через Spring Data JPA
* **Entity** — JPA-модель таблицы `bills`
* **Event Handler** — обработка событий:

    * `DepositEvent` → отправка в Deposit Service
    * `NotificationEvent` → отправка в Notification Service
* **Integration**:

    * Feign-клиенты:

        * `AccountServiceClient`
        * `DepositServiceClient`
        * `NotificationServiceClient`
    * Spring Events
    * Async
    * Spring Retry
* **Liquibase** — миграции схемы БД

---

## 📦 Конфигурация

Сервис использует:

* Spring Cloud Config
* PostgreSQL
* Feign clients
* Spring Events + @Async + @TransactionalEventListener
* Retry-логика для внешних вызовов
* Liquibase

Фрагмент `application.yml`:

```yaml
spring:
  application:
    name: bill-service
  config:
    import: "configserver:http://${SPRING_SECURITY_USER}:${SPRING_SECURITY_PASSWORD}@config-service:8001"
  cloud:
    config:
      fail-fast: true
```

---

## 🗄 Liquibase миграции

Основные файлы:

```
db/changelog/changes/001-create-bills-table.xml
db/changelog/changes/002-add-unique-default-bill-index.xml
db/changelog/db.changelog-master.xml
```

Пример миграции:

```xml
<createTable tableName="bills">
    <column name="bill_id" type="BIGSERIAL">
        <constraints primaryKey="true" nullable="false"/>
    </column>

    <column name="account_id" type="BIGINT"/>
    <column name="amount" type="NUMERIC(19,2)"/>
    <column name="is_default" type="BOOLEAN"/>
    <column name="creation_date" type="TIMESTAMPTZ"/>
    <column name="overdraft_enabled" type="BOOLEAN"/>
</createTable>

<createIndex tableName="bills" indexName="idx_default_bill_unique" unique="true">
    <column name="account_id"/>
    <column name="is_default"/>
</createIndex>
```

---

## 📘 REST API

### 🔹 Получить билл

```
GET /bills/{billId}
```

Response:

```json
{
  "billId": 1,
  "accountId": 10,
  "amount": 100.00,
  "isDefault": true,
  "creationDate": "2025-12-12T12:00:00Z",
  "overdraftEnabled": true
}
```

---

### 🔹 Получить все биллы аккаунта

```
GET /bills/accounts/{accountId}
```

---

### 🔹 Создать один билл

```
POST /bills
```

Request:

```json
{
  "accountId": 10,
  "amount": 150.00,
  "overdraftEnabled": true
}
```

---

### 🔹 Создать несколько биллов для аккаунта

```
POST /bills/accounts/{accountId}
```

Request:

```json
[
  { "amount": 100.00, "overdraftEnabled": true },
  { "amount": 200.00, "overdraftEnabled": false }
]
```

---

### 🔹 Обновить билл

```
PUT /bills/{billId}
```

---

### 🔹 Депозит на билл

```
POST /bills/deposits
```

Request:

```json
{
  "billId": 1,
  "amount": 50.00,
  "email": "test@test.com"
}
```

На уровне сервиса выполняется:

* валидация минимальной суммы (`app.deposit.min-amount`)
* проверка email через Account Service
* обновление баланса
* публикация двух событий:

    * `NotificationEvent`
    * `DepositEvent`

---

### 🔹 Удалить билл

```
DELETE /bills/{billId}
```

### 🔹 Удалить все биллы аккаунта

```
DELETE /bills/accounts/{accountId}
```

---

## 🔔 Доменные события

### DepositEvent

```java
new DepositEvent(billId, amount, email)
```

Обрабатывается асинхронно
→ вызывает `DepositServiceClient.createDeposit(...)`.

---

### NotificationEvent

Отправляется при успешном депозите:

```java
new NotificationEvent(email, amount, billId)
```

Обрабатывается → вызывает `NotificationServiceClient.sendNotification()`.

---

## 🧪 Тестирование

### ✔ Unit-тесты:

* `BillControllerUnitTest`
* Мок внешних клиентов
* Проверка валидации, ошибок, HTTP-кодов

### ✔ Интеграционные тесты:

* Полный контекст Spring
* Подключение реальной БД PostgreSQL
* Liquibase миграции
* Проверка CRUD операций
* Mock Feign-клиентов:

    * `AccountServiceClient`
    * `DepositServiceClient`
    * `NotificationServiceClient`
* Проверка обработки событий

---

## 🧱 Структура проекта

```
bill-service
 ├── controller
 │    └── BillController.java
 ├── service
 │    ├── BillService.java
 │    └── BillServiceImpl.java
 ├── handler
 │    └── event/*.java
 ├── repository
 ├── entity
 │    └── Bill.java
 ├── integration
 │    └── clients/*.java
 ├── liquibase
 ├── dto
 ├── test
 └── BillApplication.java
```

---

## 🔧 Запуск

### 1. Собрать:

```
mvn clean install
```

### 2. Запустить:

```
java -jar bill-service.jar
```

При старте сервис применяет Liquibase-миграции, подтягивает конфигурацию из Config Server и регистрируется в Eureka (если используется).

---

## 📡 Взаимодействие с другими сервисами

### Account Service

Используется для:

* проверки существования аккаунта
* валидации email при депозите

### Deposit Service

Создание записи о депозите после изменения баланса.

### Notification Service

Отправка email-уведомления пользователю.

Все вызовы — **с retry-логикой**.

---

## 📜 Ошибки и обработка

Ошибки перехватываются `GlobalExceptionHandler`:

* `404 Not Found` — билл не найден
* `400 Bad Request` — ошибка валидации
* `409 Conflict` — нарушение ограничений (например, уникальный default-билл)

Пример ошибки:

```json
{
  "message": "Bill with id: 5 not found",
  "timestamp": "2025-01-10T13:12:00Z"
}
```

---

## 🧰 Используемые технологии

* Java 17
* Spring Boot 3.5.6
* Spring Cloud (Feign, Config)
* PostgreSQL
* Liquibase
* JPA / Hibernate
* Mockito / Spring Test
* Lombok

---
