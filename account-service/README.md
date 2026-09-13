# 🧾 Account Service

Сервис аккаунтов пользователей банка. Отвечает за создание и изменение аккаунта, получение текущего аккаунта по sub из JWT и публикацию команд для создания или удаления связанных счетов.

## ✨ Функции

- создание одного аккаунта для текущего пользователя;
- получение аккаунта по ID или через /accounts/me;
- обновление имени, email и телефона;
- проверка владельца ресурса;
- защита от повторного email и повторного аккаунта пользователя;
- outbox для надежной публикации RabbitMQ-команд;
- Liquibase-миграции PostgreSQL.

## 📡 HTTP API

Сервис доступен через Gateway на http://localhost:8989.

| Метод | URL | Описание |
|---|---|---|
| GET | /accounts/me | аккаунт текущего пользователя |
| GET | /accounts/{accountId} | аккаунт по ID |
| POST | /accounts | создать аккаунт и связанные счета |
| PUT | /accounts/{accountId} | изменить аккаунт |

Для запросов требуется Bearer JWT. Клиент может работать только со своим аккаунтом; employee и admin имеют доступ к аккаунтам клиентов.

Пример создания:

~~~json
{
  "name": "Kira Customer",
  "email": "kira@example.com",
  "phone": "+375291234567",
  "bills": [
    { "amount": 0.00, "overdraftEnabled": false }
  ]
}
~~~

## 🔄 Взаимодействие

После создания аккаунта сервис сохраняет outbox-событие ACCOUNT_CREATED. bill-service получает команду bill.account.created и создает связанные счета. При удалении аккаунта используется команда bill.account.deleted.

## ⚙️ Конфигурация

- порт: 8081;
- база: account_service_database;
- конфигурация: Config Server, ключ account-service;
- discovery: Eureka;
- messaging: RabbitMQ.

Секреты базы данных задаются через ACCOUNT_DB_USER и ACCOUNT_DB_PASSWORD в .env.

## 🧪 Тесты

~~~powershell
.\gradlew.bat :account-service:test
~~~

В модуле есть unit-тесты контроллеров, сервисов и репозитория, а также integration-тесты с PostgreSQL Testcontainer.
