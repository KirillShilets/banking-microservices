# 💰 Deposit Service

Сервис истории депозитов. Он не принимает публичный запрос на создание депозита: запись создается внутренней RabbitMQ-командой от bill-service.

## ✨ Функции

- сохранение операции депозита;
- защита от повторной обработки по messageId;
- получение депозита по ID;
- PostgreSQL и Liquibase;
- RabbitMQ listener для внутренней команды.

## 📡 HTTP API

Сервис доступен через Gateway на http://localhost:8989.

| Метод | URL | Доступ |
|---|---|---|
| GET | /deposits/{depositId} | employee или admin |

Создание выполняется внутренним сообщением с billId, amount, email и messageId.

## ⚙️ Конфигурация

- порт: 8083;
- база: deposit_service_database;
- очередь: bank.deposit.save.queue;
- routing key: deposit.save;
- discovery: Eureka.

## 🧪 Тесты

~~~powershell
.\gradlew.bat :deposit-service:test
~~~

Тесты проверяют listener, валидацию, сохранение и повторную доставку одного сообщения.
