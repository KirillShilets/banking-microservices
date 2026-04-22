# Notification Service

**Notification Service** — микросервис, отвечающий за отправку email-уведомлений клиентам банка.
На данный момент поддерживает отправку уведомлений о пополнении счёта (Deposit Notification) и интегрируется с другими сервисами через RabbitMQ (основной путь) и REST (дополнительный путь).

---

## 🚀 Основной функционал

* Принимает REST-запросы на отправку уведомлений
* Отправляет email клиенту через `JavaMailSender`
* Формирует сообщение на основе данных депозита
* Возвращает DTO с информацией об успешной отправке
* Логирует весь процесс отправки
* Бросает доменное исключение `NotificationSendException` при сбоях SMTP
* Поддерживает валидацию входящих DTO
* Принимает асинхронные команды уведомления через RabbitMQ (`notification.deposit`)

---

## 🧩 Архитектура

### Слои

* **Controller**

    * `NotificationController`
    * REST API → `/notifications/deposits`
    * Валидация входящих DTO

* **Service**

    * `NotificationService`
    * `NotificationServiceImpl`
    * Формирование email-сообщений
    * Обработка ошибок SMTP

* **Exception**

    * `NotificationSendException`
    * Подключён глобальный обработчик ошибок `GlobalExceptionHandler`

* **Integration**

    * Spring Boot Mail
    * RabbitMQ (`NotificationCommandListener`, очередь `bank.notification.deposit.queue`)
    * Spring Cloud Config
    * Eureka Discovery Client

---

## 💡 Технологии

* **Java 17**
* **Spring Boot**
* **Spring Web**
* **Spring Mail**
* **Spring Validation**
* **Spring Cloud Config**
* **Eureka Client**
* **JUnit 5, Mockito, Spring Test**

---

## 📘 REST API

### 🔹 Отправить email-уведомление о депозите

```
POST /notifications/deposits
```

#### Request:

```json
{
  "billId": 1,
  "amount": 150.00,
  "email": "client@test.com"
}
```

#### Response:

```json
{
  "email": "client@test.com",
  "message": "Notification sent successfully"
}
```

#### Ошибки:

* **400** — ошибка валидации DTO
* **500** — не удалось отправить уведомление (SMTP failure)

---

## 🐇 RabbitMQ

Основной межсервисный поток:

1. `bill-service` публикует сообщение с routing key `notification.deposit`.
2. Сообщение приходит в очередь `bank.notification.deposit.queue`.
3. `NotificationCommandListener` вызывает `NotificationService`.
4. Сервис отправляет письмо через `JavaMailSender`.

---

## 📬 Email сообщение

Тело письма формируется как:

```
Subject: Deposit Notification

Your deposit was successful.
Amount: {amount}
```

Email отправляется от адреса, указанного в:

```
spring.mail.username
```

---

## ⚙️ Конфигурация

Используется Config Server:

```yaml
spring:
  application:
    name: notification-service
  config:
    import: "configserver:http://${SPRING_SECURITY_USER}:${SPRING_SECURITY_PASSWORD}@config-service:8001"
  rabbitmq:
    host: ${RABBITMQ_HOST:rabbitmq}
    port: ${RABBITMQ_PORT:5672}
```

Для отправки писем нужно добавить в Config Service:

```yaml
spring:
  mail:
    host: smtp.example.com
    port: 587
    username: bank-robot@example.com
    password: secret
    properties:
      mail.smtp.auth: true
      mail.smtp.starttls.enable: true
```

---

## 🧪 Тестирование

### Unit тесты

* **NotificationControllerUnitTest**

    * мокируется сервис
    * проверяются статусы, DTO, валидация
    * используется GlobalExceptionHandler

* **NotificationServiceUnitTest**

    * мок `JavaMailSender`
    * проверка сформированного письма
    * тестирование ошибок SMTP → `NotificationSendException`

---

### Интеграционные тесты

**NotificationIntegrationTest**

* Полный Spring контекст
* Мок `JavaMailSender`
* Проверка:

    * корректного формирования сообщения
    * вызова sender'а через ArgumentCaptor
    * поведения при ошибках SMTP
    * обработки ошибок валидации

---

## 🛠 Dockerfile

Сборка и запуск выполняется через двухэтапный билд:

* Builder: Gradle + JDK17
* Runtime: Eclipse Temurin JRE 17 Alpine

JAR упаковывается как `app.jar`.

---

## 📁 Структура проекта

```
notification-service
 ├── controller
 ├── service
 │    ├── impl
 ├── integration
 ├── exception
 ├── config
 ├── resources
 ├── test
 └── NotificationApplication.java
```

---

## ▶️ Запуск

### Gradle

```
./gradlew clean bootRun
```

### Docker

```
docker build -t notification-service .
docker run -p 9999:9999 notification-service
```

---
