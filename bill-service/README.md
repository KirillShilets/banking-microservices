# 💳 Bill Service

Сервис банковских счетов. Хранит счета клиентов, проверяет права доступа, выполняет sandbox-пополнение и публикует команды для записи депозита и отправки уведомления.

## ✨ Функции

- создание одного или нескольких счетов;
- назначение default-счета;
- получение счета и списка счетов аккаунта;
- проверка владельца, сотрудника и администратора;
- пополнение с блокировкой строки и проверкой минимальной суммы;
- outbox и идемпотентная обработка сообщений;
- Liquibase-миграции PostgreSQL.

## 📡 HTTP API

Внешний URL: http://localhost:8989.

| Метод | URL | Описание |
|---|---|---|
| GET | /bills/{billId} | получить счет |
| GET | /bills/accounts/{accountId} | получить счета аккаунта |
| POST | /bills | создать счет |
| POST | /bills/accounts/{accountId} | создать несколько счетов |
| POST | /bills/sandbox/deposits | sandbox-пополнение |

Sandbox-пополнение доступно только ролям employee и admin и только при SANDBOX_DEPOSITS_ENABLED=true. Минимальная сумма задается DEPOSIT_MIN_AMOUNT.

Пример:

~~~json
{
  "billId": 1,
  "amount": 25.00
}
~~~

## 💰 Сценарий пополнения

В одной транзакции сервис проверяет счет, владельца и сумму, увеличивает баланс и создает две outbox-команды: для deposit-service и notification-service. Команды передаются через RabbitMQ после фиксации транзакции.

## ⚙️ Конфигурация

- порт: 8082;
- база: bill_service_database;
- DEPOSIT_MIN_AMOUNT по умолчанию 2.60 в конфигурации сервиса;
- SANDBOX_DEPOSITS_ENABLED по умолчанию false;
- discovery: Eureka;
- messaging: RabbitMQ.

## 🧪 Тесты

~~~powershell
.\gradlew.bat :bill-service:test
~~~

Проверяются права доступа, валидация денег, пополнение, outbox, idempotency и сценарии удаления счетов.
