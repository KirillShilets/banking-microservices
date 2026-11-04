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

Внешний URL: http://api.localhost (внутри кластера Gateway слушает порт 8989 и наружу не публикуется).

| Метод | URL | Описание |
|---|---|---|
| GET | /bills/{billId} | получить счет |
| GET | /bills/accounts/{accountId} | получить счета аккаунта |
| POST | /bills | создать счет |
| POST | /bills/accounts/{accountId} | создать несколько счетов |
| POST | /bills/sandbox/deposits | sandbox-пополнение |

Sandbox-пополнение доступно только ролям employee и admin и только при `APP_SANDBOX_DEPOSITS_ENABLED=true` (свойство `app.sandbox.deposits-enabled`). Минимальная сумма задается `DEPOSIT_MIN_AMOUNT`.

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
- `DEPOSIT_MIN_AMOUNT` — минимальная сумма пополнения, по умолчанию 2.60, задается в конфигурации сервиса;
- `APP_SANDBOX_DEPOSITS_ENABLED` (`app.sandbox.deposits-enabled`) — по умолчанию false, в kind включён в `helm/bank-platform/values-kind.yaml`;
- discovery: сервис адресуется по Kubernetes DNS; Eureka в платформе не используется;
- messaging: RabbitMQ.

## 🧪 Тесты

~~~powershell
.\gradlew.bat :bill-service:test
~~~

Проверяются права доступа, валидация денег, пополнение, outbox, idempotency и сценарии удаления счетов.
