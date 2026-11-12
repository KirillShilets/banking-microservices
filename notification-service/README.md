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

Учетные данные задаются в `.env` и попадают в Kubernetes Secret:

~~~env
MAIL_USERNAME=mail@example.com
MAIL_PASSWORD=change-me
~~~

Сервер и порт — это не секреты, они задаются в Helm-значениях (`services.notification-service.env` в `helm/bank-platform/values-kind.yaml`):

~~~yaml
MAIL_HOST: smtp.gmail.com
MAIL_PORT: "587"
~~~

Для Gmail требуется app password и доступность smtp.gmail.com:587 из кластера (в kind — через Docker Desktop). SMTP-ошибка не должна блокировать проверку готовности: mail health отключен, а проба использует /actuator/health/liveness.

## ⚙️ Конфигурация

- порт: 9999;
- база: notification_service_database;
- очередь: bank.notification.deposit.queue;
- discovery: сервис адресуется по Kubernetes DNS; Eureka в платформе не используется;
- messaging: RabbitMQ.

## 🧪 Тесты

~~~powershell
.\gradlew.bat :notification-service:test
~~~

Проверяются успешная отправка, ошибки mail sender, валидация команды и идемпотентность.
