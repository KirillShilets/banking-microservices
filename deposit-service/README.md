# Deposit Service

**Deposit Service** — микросервис для управления депозитами клиентов.
Сервис обрабатывает создание депозитов, получение информации о них, хранение данных в PostgreSQL, использует Liquibase для миграций, регистрируется в Eureka и принимает межсервисные команды через RabbitMQ.

---

## 🚀 Основной функционал

* Создание депозитов
* Получение депозита по ID
* Получение списка депозитов клиента
* Контроль минимальной суммы депозита через конфигурацию
* Хранение данных в PostgreSQL
* Liquibase миграции базы данных
* Интеграция с Eureka Discovery Service
* Приём команд сохранения депозита через RabbitMQ (`deposit.save`)
* Unit и интеграционные тесты

---

## 🧩 Архитектура

### Основные компоненты

* **Controller** — REST API (`DepositController`)
* **Service** — бизнес-логика и валидация (`DepositService`, `DepositValidatorService`)
* **Repository** — доступ к данным через Spring Data JPA (`DepositRepository`)
* **Entity** — JPA-модель таблицы `deposits`
* **Exception Handling** — централизованная обработка ошибок
* **Messaging** — `DepositCommandListener` для очереди `bank.deposit.save.queue`
* **Integration** — Eureka для регистрации и discovery сервисов
* **Liquibase** — миграции базы данных

---

## 📦 Конфигурация

### application.yml

```yaml
server:
  port: 8080

spring:
  datasource:
    url: jdbc:postgresql://postgres:5432/deposit_service_database
    username: ${DEPOSIT_DB_USER}
    password: ${DEPOSIT_DB_PASSWORD}
    driver-class-name: org.postgresql.Driver
  liquibase:
    enabled: true
    change-log: classpath:db/changelog/db.changelog-master.xml
  rabbitmq:
    host: ${RABBITMQ_HOST:rabbitmq}
    port: ${RABBITMQ_PORT:5672}

eureka:
  client:
    service-url:
      defaultZone: http://discovery-service:8761/eureka/
    register-with-eureka: true
    fetch-registry: true
  instance:
    prefer-ip-address: true

app:
  deposit:
    min-amount: ${DEPOSIT_MIN_AMOUNT:2.60}
```

---

## 🌍 REST API

### 🔹 Создать депозит

```
POST /deposits
```

Request Body:

```json
{
  "amount": 150.00,
  "customerId": 1
}
```

### 🔹 Получить депозит по ID

```
GET /deposits/{id}
```

### 🔹 Получить все депозиты клиента

```
GET /deposits/customer/{customerId}
```

---

## 🐇 RabbitMQ

Межсервисный путь записи депозита:

1. `bill-service` публикует сообщение с routing key `deposit.save`.
2. Сообщение попадает в очередь `bank.deposit.save.queue`.
3. `DepositCommandListener` принимает DTO и сохраняет депозит.

---

## 🗄️ Миграции базы данных (Liquibase)

Файл:

```
src/main/resources/db/changelog/db.changelog-master.xml
```

Пример миграции:

```xml
<createTable tableName="deposits">
    <column name="id" type="BIGSERIAL" autoIncrement="true" />
    <column name="amount" type="DECIMAL(19,2)" />
    <column name="customer_id" type="BIGINT" />
    <column name="status" type="VARCHAR(50)" />
    <column name="created_at" type="TIMESTAMP" />
</createTable>
```

---

## 🧪 Тестирование

### Unit Tests

* `DepositServiceTest`
* `DepositValidatorServiceTest`
* `DepositControllerTest`

Покрытие:

* бизнес-логика
* валидация
* обработка исключений

### Integration Test

* `DepositControllerIntegrationTest`

Проверяет:

* создание депозита
* получение депозита
* обработку ошибок
* конфигурацию Jackson
* контроль минимальной суммы

Запуск тестов:

```bash
./gradlew test
```

---

## 🐳 Docker

### Сборка образа

```bash
docker build -t bank-deposit-service .
```

### Запуск контейнера

```bash
docker run -d \
  -p 8080:8080 \
  -e DEPOSIT_DB_USER=user \
  -e DEPOSIT_DB_PASSWORD=pass \
  -e DEPOSIT_MIN_AMOUNT=5.00 \
  bank-deposit-service
```

---

## ▶️ Локальный запуск

```bash
./gradlew clean bootRun
```

---

## 📦 Сборка

```bash
./gradlew bootJar
```

Собранный Jar:

```
build/libs/app.jar
```

---

## 🧱 Структура проекта

```
deposit-service
 ├── src/main/java/org/bank/deposit/
 │     ├── controller/DepositController.java
 │     ├── service/DepositService.java
 │     ├── service/DepositValidatorService.java
 │     ├── repository/DepositRepository.java
 │     ├── exception/*.java
 │     └── DepositApplication.java
 ├── src/main/resources/
 │     ├── application.yml
 │     └── db/changelog/db.changelog-master.xml
 ├── test/org/bank/deposit/
 │     ├── integration/DepositControllerIntegrationTest.java
 │     └── unit/*.java
 ├── build.gradle
 ├── Dockerfile
 └── README.md
```

---

## 🧰 Используемые технологии

* Java 17
* Spring Boot 3.5.6
* Spring Cloud Eureka Client
* PostgreSQL
* Liquibase
* JPA / Hibernate
* Mockito / Spring Test
* Docker

---
