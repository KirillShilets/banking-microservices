# Common Library (`common-lib`)

`common-lib` — общая библиотека для микросервисов банка, обеспечивающая:

* RabbitMQ topology/config для межсервисного взаимодействия
* DTO для запросов и ответов
* Обработку исключений и глобальный Exception Handler
* Валидацию входных данных
* Общие messaging DTO для RabbitMQ команд и RPC

Библиотека используется всеми клиентами микросервисов (`deposit-service`, `bill-service`, `account-service`, `notification-service`).

---

## 📁 Структура проекта

```
common-lib/
│
├── src/main/java/org/bank/messaging/
│   ├── RabbitTopology.java
│   ├── config/RabbitMessagingConfiguration.java
│   └── dto/
│       ├── AccountLookupRequestDTO.java
│       ├── AccountLookupResponseDTO.java
│       ├── CreateBillsCommandDTO.java
│       └── DeleteBillsByAccountCommandDTO.java
│
├── src/main/java/org/bank/dto/
│   ├── request/
│   │   ├── BillRequestDTO.java
│   │   ├── CreateBillRequestDTO.java
│   │   └── DepositRequestDTO.java
│   └── response/
│       ├── AccountResponseDTO.java
│       ├── BillDepositResponseDTO.java
│       ├── BillResponseDTO.java
│       ├── DepositResponseDTO.java
│       └── NotificationResponseDTO.java
│
├── src/main/java/org/bank/exception/
│   ├── AlreadyExistsException.java
│   ├── BadRequestException.java
│   ├── InternalServerException.java
│   ├── MethodNotAllowedException.java
│   ├── NotFoundException.java
│   ├── NotificationSendException.java
│   ├── ServiceException.java
│   └── UnauthorizedException.java
│
├── src/main/java/org/bank/exception/dto/
│   └── ErrorResponseDTO.java
│
├── src/main/java/org/bank/exception/handler/
│   └── GlobalExceptionHandler.java
│
├── build.gradle
└── README.md
```

---

## ⚙️ RabbitMQ и Messaging

`common-lib` предоставляет:

* `RabbitTopology` с единым именованием exchange/queues/routing keys
* `RabbitMessagingConfiguration` (durable queues, bindings, JSON converter, `RabbitTemplate`)
* DTO для RabbitMQ commands и RPC (`account.query`, `bill.account.created`, `bill.account.deleted`, `deposit.save`, `notification.deposit`)
* Валидацию входных DTO через Jakarta Validation

---

## 🧩 Исключения

Все ошибки обрабатываются через наследников `ServiceException`:

* `NotFoundException` → 404
* `BadRequestException` → 400
* `AlreadyExistsException` → 409
* `InternalServerException` → 500
* `UnauthorizedException` → 401
* `MethodNotAllowedException` → 405
* `NotificationSendException` → 500

Глобальный `GlobalExceptionHandler` формирует JSON-ответ с полями:

```json
{
  "message": "Error message",
  "status": 400,
  "timestamp": "2025-12-02T19:00:00"
}
```

---

## 📦 Сборка

Используется Gradle как `java-library`:

```bash
./gradlew clean build
```

Библиотека публикуется как jar для использования в микросервисах.

---

## 📘 Особенности

* Полная совместимость с Spring Boot 3.5.6 и Spring Cloud 2025.0.0
* DTO строго типизированы и поддерживают валидацию
* RabbitMQ topology и messaging DTO легко интегрируются в любой сервис
* Ошибки доменной логики унифицированы через `ServiceException`
* Поддержка RPC timeout для RabbitMQ-запросов
* Логирование всех ошибок через SLF4J

---

## 🧪 Тесты

Используется JUnit 5:

* Проверка корректной сериализации/десериализации DTO
* Проверка корректности обработки `ServiceException` в `GlobalExceptionHandler`
* Проверка `GlobalExceptionHandler` на основные типы ошибок

Запуск:

```bash
./gradlew test
```
