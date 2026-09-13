# 🔔 Notification Service

Сервис отправки email-уведомлений о пополнении счета. Получает команды через RabbitMQ, отправляет письмо через SMTP и сохраняет факт доставки для идемпотентности.

## ✨ Функции

- обработка команды notification.deposit;
- отправка письма на email аккаунта;
- сохранение messageId в таблице доставок;
- повторная доставка одного сообщения не отправляет письмо второй раз;
- обработка ошибок SMTP через NotificationSendException.

## 🐇 Взаимодействие

Очередь: bank.notification.deposit.queue.

Сервис не имеет публичного REST endpoint для отправки письма. Команды приходят от bill-service через RabbitMQ.

## 📧 SMTP

Параметры задаются в .env:

~~~env
MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_USERNAME=mail@example.com
MAIL_PASSWORD=change-me
~~~

Для Gmail требуется app password и доступность smtp.gmail.com:587 из Docker. SMTP-ошибка не должна блокировать Docker healthcheck: mail health отключен, а проверка контейнера использует /actuator/health/liveness.

## ⚙️ Конфигурация

- порт: 9999;
- база: notification_service_database;
- очередь: bank.notification.deposit.queue;
- discovery: Eureka;
- messaging: RabbitMQ.

## 🧪 Тесты

~~~powershell
.\gradlew.bat :notification-service:test
~~~

Проверяются успешная отправка, ошибки mail sender, валидация команды и идемпотентность.
