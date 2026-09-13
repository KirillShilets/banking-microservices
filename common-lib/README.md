# 📦 Common Library

Общая Java-библиотека для backend-модулей проекта.

## 🧩 Содержимое

- request/response DTO для аккаунтов, счетов, депозитов и уведомлений;
- общие исключения и GlobalExceptionHandler;
- валидация денежных значений и открытия счетов;
- RabbitMQ topology: exchange, queues, routing keys и DLQ;
- общая конфигурация AMQP.

## 🔌 Использование

Модули account-service, bill-service, deposit-service и notification-service подключают библиотеку как Gradle project dependency:

~~~groovy
implementation project(':common-lib')
~~~

## 🛠️ Сборка

~~~powershell
.\gradlew.bat :common-lib:build
~~~

Библиотека не является самостоятельным запускаемым приложением.
