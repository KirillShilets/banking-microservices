# 🏦 Spring Cloud Banking System

Учебная банковская система на микросервисной архитектуре. Проект запускается в Kubernetes: Helm устанавливает приложение, а Kubernetes-операторы управляют PostgreSQL, RabbitMQ и Keycloak.

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
Frontend (React/Vite, Ingress)
        |
        v
API Gateway (Ingress) ---- Keycloak (Ingress)
        |
        +--> account-service (:8081)
        +--> bill-service (:8082)
        +--> deposit-service (:8083)

Spring-сервисы -- Kubernetes DNS --> сервисы приложения
RabbitMQ Cluster Operator --> RabbitMQ (ClusterIP, 5672)
CloudNativePG Operator --> PostgreSQL (ClusterIP, 5432)
Keycloak Operator --> Keycloak и отдельная PostgreSQL database
MinIO (ClusterIP) <-- PostgreSQL backups
notification-service (ClusterIP) <-- email-уведомления
~~~

Бизнес-сервисы не публикуют свои HTTP-порты наружу. Для внешних запросов используется Gateway.

## 📡 Сервисы и порты

| Компонент | Порт | Назначение |
|---|---:|---|
| Frontend | Ingress | Web-интерфейс |
| Keycloak | Ingress / ClusterIP | OIDC-провайдер и пользовательские роли |
| Gateway Service | Ingress / ClusterIP | Единая точка входа в API |
| Account Service | ClusterIP | Аккаунты пользователей |
| Bill Service | ClusterIP | Банковские счета и пополнения |
| Deposit Service | ClusterIP | История депозитов |
| Notification Service | ClusterIP | Отправка email |
| PostgreSQL | ClusterIP | Данные сервисов и Keycloak |
| RabbitMQ | ClusterIP | AMQP-команды и события |
| MinIO | ClusterIP | PostgreSQL backups в S3-совместимом bucket |

## 🛠️ Технологии

- Java 17;
- Spring Boot 3.5.6;
- Spring Cloud 2025.0.0;
- Gradle multi-module;
- Spring Cloud Gateway WebFlux;
- Spring Security OAuth2 Resource Server;
- Keycloak 26;
- PostgreSQL 16, Spring Data JPA, Liquibase;
- RabbitMQ;
- React 19, TypeScript, Vite и Axios;
- JUnit 5, Mockito и Testcontainers;
- Kubernetes, Helm и Helm Operators.

## 🚀 Быстрый запуск

### ✅ Требования

- Docker Desktop с включенным Docker Engine;
- Java 17 для запуска Gradle-тестов локально;
- Node.js 20+ — только для локальной разработки frontend;
- kubectl, Helm и kind.

### 1️⃣ Подготовить переменные окружения

Скопируйте .env.example в .env:

~~~powershell
Copy-Item .env.example .env
~~~

.env не должен попадать в Git. Замените каждый пароль `change-me` уникальным значением и заполните SMTP-логин и пароль. Для другого SMTP-сервера измените `MAIL_HOST` и `MAIL_PORT` в `helm/bank-platform/values-kind.yaml`. В bootstrap есть проверка, которая не даст развернуть примерные пароли.

### 2️⃣ Локальные адреса

Для локального запуска используются адреса в зоне `.localhost`; отдельные записи в Windows hosts не нужны.

### 3️⃣ Развернуть систему в Kubernetes

~~~powershell
powershell -ExecutionPolicy Bypass -File deploy\kind\bootstrap.ps1
~~~

### 4️⃣ Открыть интерфейсы

- Frontend: http://app.localhost
- Gateway: http://api.localhost
- Keycloak: http://keycloak.localhost

### 🧹 Остановка и очистка

~~~powershell
helm uninstall bank -n bank
~~~

Удаление Helm-релиза не удаляет PersistentVolumeClaims с данными PostgreSQL, RabbitMQ и MinIO. Удаляй PVC только после отдельного экспорта нужных данных и осознанного решения о полном сбросе.

Подробности установки операторов, бэкапов и миграции находятся в [deploy/README.md](deploy/README.md).

## 👥 Тестовые пользователи Keycloak

Пользователи импортируются из keycloak/import/bank-realm-realm.json. Пароли учебные и отмечены в realm как временные: при первом входе Keycloak может попросить установить новый пароль.

| Логин | Пароль | Роль | Назначение |
|---|---|---|---|
| customer.kira | Qpass123 | customer | Обычный клиент |
| employee.bob | Qpass1234 | employee | Сотрудник банка |
| admin.kirill | Qpass12345 | admin | Администратор |

Это не учетные записи PostgreSQL.

| Система | Логин | Пароль |
|---|---|---|
| Keycloak Admin Console | значение сгенерированного Secret `keycloak-initial-admin` | значение из того же Secret |
| RabbitMQ | значение RABBITMQ_USERNAME | значение RABBITMQ_PASSWORD |

Перед публикацией проекта замените демонстрационные секреты в локальном .env и не коммитьте этот файл.

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
- Keycloak database;
- RabbitMQ;
- DEPOSIT_MIN_AMOUNT;
- SANDBOX_DEPOSITS_ENABLED;
- SMTP-параметры.

Настройки Spring-сервисов для Kubernetes находятся в `config-service/src/main/resources/services` и зеркалируются в ConfigMap Helm-чарта. Изменения синхронизируются командой `powershell -File deploy/scripts/sync-config.ps1`.

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
config-service/        исходные конфигурации; для Kubernetes используется ConfigMap
discovery-service/     исходный модуль Eureka; отключен в Kubernetes
security-lib/          общая JWT-конфигурация и роли
common-lib/            DTO, исключения и RabbitMQ topology
common-test-lib/       общая тестовая инфраструктура
frontend/              React-клиент
keycloak/import/       realm и demo-пользователи
deploy/k8s/infra/      операторы и манифесты PostgreSQL, RabbitMQ, Keycloak и MinIO
postman/               заготовки для Postman
~~~

## 🔮 Планы по развитию (Roadmap)
- ~~Security: JWT авторизация, OAuth2 Resource Server~~
- Caching: Redis для кеширования
- Orchestration: Kubernetes и Helm
- Backups: регулярные backup и проверяемое восстановление PostgreSQL
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
