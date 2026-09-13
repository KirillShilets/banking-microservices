# 🏦 Spring Cloud Banking System

Учебная банковская система на микросервисной архитектуре. Проект показывает, как связать Spring Boot-сервисы через Config Server, Eureka, API Gateway и RabbitMQ, а также как добавить OAuth2/OIDC-аутентификацию через Keycloak.

## ✨ Возможности

- управление аккаунтами клиентов;
- создание и просмотр банковских счетов;
- пополнение счета в sandbox-режиме;
- асинхронное сохранение операций депозитов;
- асинхронная отправка email-уведомлений;
- JWT-аутентификация и роли customer, employee, admin;
- PostgreSQL с Liquibase-миграциями;
- unit- и integration-тесты с Testcontainers.

## 🧩 Архитектура

~~~text
Frontend (React/Vite, :3000)
        |
        v
API Gateway (:8989) ---- Keycloak (:8080)
        |
        +--> account-service (:8081)
        +--> bill-service (:8082)
        +--> deposit-service (:8083)

config-service (:8001) <---- все Spring-сервисы
discovery-service (:8761) <-- Eureka
RabbitMQ (:5672, :15672) <-- асинхронные команды и события
PostgreSQL                 <-- отдельная БД для каждого сервиса
notification-service (:9999) <-- email-уведомления
~~~

Бизнес-сервисы не публикуют свои HTTP-порты наружу. Для внешних запросов используется Gateway.

## 📡 Сервисы и порты

| Компонент | Порт | Назначение |
|---|---:|---|
| Frontend | 3000 | Web-интерфейс |
| Keycloak | 8080 | OIDC-провайдер и пользовательские роли |
| Config Service | 8001 | Централизованная конфигурация |
| Discovery Service | 8761 | Eureka Server |
| Gateway Service | 8989 | Единая точка входа в API |
| Account Service | 8081 | Аккаунты пользователей |
| Bill Service | 8082 | Банковские счета и пополнения |
| Deposit Service | 8083 | История депозитов |
| Notification Service | 9999 | Отправка email |
| RabbitMQ | 5672 / 15672 | AMQP и management UI |

## 🛠️ Технологии

- Java 17;
- Spring Boot 3.5.6;
- Spring Cloud 2025.0.0;
- Gradle multi-module;
- Spring Cloud Config, Eureka и Gateway WebFlux;
- Spring Security OAuth2 Resource Server;
- Keycloak 26;
- PostgreSQL 16, Spring Data JPA, Liquibase;
- RabbitMQ;
- React 19, TypeScript, Vite и Axios;
- JUnit 5, Mockito и Testcontainers;
- Docker Compose.

## 🚀 Быстрый запуск

### ✅ Требования

- Docker Desktop с включенным Docker Engine;
- Java 17 для запуска Gradle-тестов локально;
- Node.js 20+ — только для локального запуска frontend.

### 1️⃣ Подготовить переменные окружения

Скопируйте .env.example в .env:

~~~powershell
Copy-Item .env.example .env
~~~

.env не должен попадать в Git. Для реальной почты укажите доступный SMTP-сервер и пароль приложения. Для запуска без отправки реальных писем достаточно демонстрационных значений: healthcheck Notification Service не зависит от SMTP.

### 2️⃣ Добавить hostname Keycloak

Токены содержат issuer http://keycloak.localhost:8080/realms/bank-realm. Добавьте в hosts:

~~~text
127.0.0.1 keycloak.localhost
~~~

В Windows файл находится в C:\Windows\System32\drivers\etc\hosts и требует прав администратора.

### 3️⃣ Запустить систему

~~~powershell
docker compose up --build
~~~

Или в фоне:

~~~powershell
docker compose up -d --build
docker compose ps
~~~

При изменении конфигурации пересоздайте зависимые сервисы:

~~~powershell
docker compose up -d --force-recreate --build config-service notification-service gateway-service
~~~

### 4️⃣ Открыть интерфейсы

- Frontend: http://localhost:3000
- Gateway: http://localhost:8989
- Keycloak: http://keycloak.localhost:8080
- Eureka: http://localhost:8761
- RabbitMQ UI: http://localhost:15672

### 🧹 Остановка и очистка

~~~powershell
docker compose down
~~~

Команда ниже удаляет PostgreSQL volume и все данные проекта:

~~~powershell
docker compose down -v
~~~

Используйте её только для полного сброса локальной базы.

## 👥 Тестовые пользователи Keycloak

Пользователи импортируются из keycloak/import/bank-realm-realm.json. Пароли учебные и отмечены в realm как временные: при первом входе Keycloak может попросить установить новый пароль.

| Логин | Пароль | Роль | Назначение |
|---|---|---|---|
| customer.kira | Qpass123 | customer | Обычный клиент |
| employee.bob | Qpass1234 | employee | Сотрудник банка |
| admin.kirill | Qpass12345 | admin | Администратор |

Это не учетные записи PostgreSQL и не учетные записи Config Server.

| Система | Логин | Пароль |
|---|---|---|
| Keycloak Admin Console | значение KEYCLOAK_ADMIN | значение KEYCLOAK_ADMIN_PASSWORD |
| Config Server Basic Auth | значение SPRING_SECURITY_USER_NAME | значение SPRING_SECURITY_PASSWORD |
| RabbitMQ | значение RABBITMQ_USERNAME | значение RABBITMQ_PASSWORD |

В .env.example указаны демонстрационные значения admin/change-me, user/change-me и bankmq/change-me. Перед публикацией проекта замените их и не коммитьте .env.

## 🔐 API через Gateway

Все защищенные запросы выполняются с заголовком:

~~~http
Authorization: Bearer <access-token>
~~~

### 👤 Accounts

| Метод | URL | Доступ |
|---|---|---|
| GET | /accounts/me | любой авторизованный пользователь |
| GET | /accounts/{accountId} | владелец, сотрудник или администратор |
| POST | /accounts | customer, employee, admin; для клиента один аккаунт |
| PUT | /accounts/{accountId} | владелец, сотрудник или администратор |

### 💳 Bills

| Метод | URL | Доступ |
|---|---|---|
| GET | /bills/{billId} | владелец, сотрудник или администратор |
| GET | /bills/accounts/{accountId} | владелец, сотрудник или администратор |
| POST | /bills | владелец, сотрудник или администратор |
| POST | /bills/accounts/{accountId} | владелец, сотрудник или администратор |
| POST | /bills/sandbox/deposits | employee или admin при включенном sandbox |

Пополнение требует SANDBOX_DEPOSITS_ENABLED=true и сумму не меньше DEPOSIT_MIN_AMOUNT.

### 💰 Deposits

| Метод | URL | Доступ |
|---|---|---|
| GET | /deposits/{depositId} | employee или admin |

Создание записи депозита происходит внутренней RabbitMQ-командой после пополнения счета.

## 🔄 Асинхронный сценарий пополнения

1. bill-service проверяет права, минимальную сумму и баланс.
2. Баланс счета обновляется в PostgreSQL.
3. Через outbox публикуются команды для deposit-service и notification-service.
4. deposit-service сохраняет историю операции идемпотентно по messageId.
5. notification-service отправляет email и сохраняет факт доставки.

## ⚙️ Конфигурация

Основные параметры находятся в .env.example:

- PostgreSQL и пользователи отдельных баз данных;
- Keycloak и Config Server;
- RabbitMQ;
- порты сервисов;
- DEPOSIT_MIN_AMOUNT;
- SANDBOX_DEPOSITS_ENABLED;
- SMTP-параметры.

Конфигурация Spring-сервисов хранится в config-service/src/main/resources/services. Config Server монтирует эту директорию в Docker-контейнер.

## 🧪 Проверка проекта

~~~powershell
.\gradlew.bat test
~~~

Интеграционные тесты используют Testcontainers и требуют работающий Docker Engine. Для frontend:

~~~powershell
cd frontend
npm ci
npm run lint
npm run build
~~~

## 🗂️ Структура репозитория

~~~text
account-service/       аккаунты и владельцы аккаунтов
bill-service/          счета, баланс, outbox и sandbox-пополнения
deposit-service/       история депозитов
notification-service/  email-уведомления
gateway-service/       внешний API Gateway
config-service/        централизованная конфигурация
discovery-service/     Eureka Server
security-lib/          общая JWT-конфигурация и роли
common-lib/            DTO, исключения и RabbitMQ topology
common-test-lib/       общая тестовая инфраструктура
frontend/              React-клиент
keycloak/import/       realm и demo-пользователи
postgres/init/         создание баз и ролей PostgreSQL
postman/               заготовки для Postman
~~~

## 🔮 Планы по развитию (Roadmap)
- ~~Security: JWT авторизация, OAuth2 Resource Server~~
- Caching: Redis для кеширования
- Orchestration: Kubernetes (K8s) + Helm Charts  
- Messaging: DLQ / Outbox / idempotency для RabbitMQ-сценариев
- Observability: ELK Stack или Prometheus + Grafana
- Saga Pattern: Распределенные транзакции

## ⚠️ Известные ограничения

- проект предназначен для учебного и локального использования;
- demo-пароли нельзя использовать в production;
- email требует доступного SMTP-сервера и корректного app password;
- внешняя публикация сервисов напрямую, обходя Gateway, не является целевым сценарием;
- удаление аккаунта и счетов реализовано через внутренние события.

## 👨‍💻 Автор

Разработчик: KirillShilets