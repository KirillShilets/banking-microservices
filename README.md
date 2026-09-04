# 🏦 Spring Cloud Banking System

Spring Cloud Banking System — учебный проект распределённой банковской системы на микросервисной архитектуре с использованием Spring Cloud и Docker.
Проект демонстрирует основные паттерны микросервисов: Service Discovery, Centralized Configuration, API Gateway, Fault Tolerance, асинхронное взаимодействие через события, а также аутентификацию и авторизацию через Keycloak (OAuth2 / OIDC).

---

## 🛠 Технологический стек

**Core**

* Java 17
* Spring Boot 3.5.6
* Spring Cloud 2025.0.0
* Gradle (Multi-module project)

**Security**

* Keycloak 26 — Identity Provider (OIDC, Authorization Code + PKCE)
* Spring Security OAuth2 Resource Server — проверка JWT на gateway и в каждом сервисе
* Role-based access (realm roles `admin` / `employee` / `customer`) + проверка владельца ресурса

**Infrastructure & Cloud**

* Spring Cloud Netflix Eureka — Service Discovery
* Spring Cloud Config — Централизованное управление конфигурацией
* Spring Cloud Gateway — API Gateway (Reactive/WebFlux)
* RabbitMQ (AMQP) — межсервисное взаимодействие (commands + RPC)

**Data & Persistence**

* PostgreSQL — Реляционная база данных
* Liquibase — Управление миграциями БД
* Spring Data JPA — ORM

**Frontend**

* React + TypeScript + Vite
* keycloak-js — логин/логаут, обновление токена

**Utilities & Testing**

* Docker & Docker Compose — Контейнеризация и оркестрация
* Resilience4j — Circuit Breaker (отказоустойчивость)
* JUnit 5, Mockito — Unit тестирование
* Testcontainers — Интеграционное тестирование с реальной БД

---

## 🧩 Архитектура сервисов

### Инфраструктурные сервисы

| Сервис            | Порт | Описание                                                  |
| ----------------- | ---- | --------------------------------------------------------- |
| Config Service    | 8001 | Сервер конфигураций с Basic Auth.                         |
| Discovery Service | 8761 | Eureka Server — реестр сервисов.                          |
| Gateway Service   | 8989 | API Gateway: маршрутизация, фильтрация, обработка ошибок. |
| Keycloak          | 8080 | Identity Provider, realm `bank-realm`.                    |
| Frontend          | 3000 | SPA (nginx), ходит в Gateway с Bearer-токеном.            |

### Бизнес-сервисы

| Сервис               | Порт (внутр.) | Описание                                    |
| -------------------- | ------------- | ------------------------------------------- |
| Account Service      | 8081          | Управление пользователями и аккаунтами.     |
| Bill Service         | 8082          | Управление счетами, переводами, депозитами. |
| Deposit Service      | 8080          | Логика обработки депозитов.                 |
| Notification Service | 9999          | Отправка email-уведомлений (SMTP).          |

Бизнес-сервисы не публикуют порты наружу — доступ только через Gateway.

### Общие библиотеки

* `common-lib` — DTO, Exception Handlers, RabbitMQ topology/config
* `common-test-lib` — Конфигурации для Testcontainers
* `security-lib` — автоконфигурация Resource Server (servlet + reactive), маппинг ролей Keycloak в `ROLE_*`, `AuthenticatedUser`

---

## 🔐 Безопасность

**Поток аутентификации**

1. Frontend перенаправляет пользователя на Keycloak (Authorization Code + PKCE, public client `banking-frontend`).
2. Keycloak возвращает access token (JWT) с `realm_access.roles` и `aud: banking-frontend`.
3. Frontend отправляет запросы в Gateway с заголовком `Authorization: Bearer <token>`.
4. Gateway и каждый бизнес-сервис проверяют подпись (JWKS), `iss` и `aud`. Без валидного токена — `401`.
5. Внутри сервисов права проверяются по ролям (`@PreAuthorize`) и по владельцу (`owner_subject` = `sub` из токена).

**Матрица доступа**

| Действие                          | customer                | employee | admin |
| --------------------------------- |-------------------------| -------- | ----- |
| Создать аккаунт                   | ✅ (один на юзера)       | ✅  | ✅    |
| `GET /accounts/me`                | ✅                       | ✅       | ✅    |
| Просмотр / изменение аккаунта     | только свой             | любой    | любой |
| Удаление аккаунта                 | ❌                       | ❌       | ✅    |
| Операции со счетами (bills)       | только своего аккаунта  | любые | любые |

Чужой ресурс для `customer` → `403`, отсутствие токена → `401`.

**Тестовые пользователи** (создаются при импорте realm; пароли временные — при первом входе Keycloak попросит сменить)

| Логин           | Роль     | Пароль      |
|-----------------| -------- | ----------- |
| `customer.kira` | customer | `Qpass123`  |
| `employee.bob`  | employee | `Qpass1234` |
| `admin.kirill`  | admin    | `Qpass12345`|

Открытые эндпоинты: `/actuator/health`, `/actuator/info`, `OPTIONS *` (CORS preflight).

---


## 🚀 Запуск проекта

Требуется Docker и Docker Compose.

### 1. Клонирование репозитория

```bash
git clone https://github.com/KirillShilets/banking-microservices.git
cd spring-cloud-banking-system
```

### 2. Сборка проекта (JAR файлы)

```bash
./gradlew clean build
```

### 3. Настройка окружения

Создайте файл `.env` в корне проекта:

```env
# Database Credentials
POSTGRES_USER=bank_user
POSTGRES_PASSWORD=bankingadmin
POSTGRES_EXTERNAL_PORT=5433

# Service DB Users
BILL_DB_USER=bill_service_admin
BILL_DB_PASSWORD=billserviceadmin
BILL_SERVICE_PORT=8082

ACCOUNT_DB_USER=account_service_admin
ACCOUNT_DB_PASSWORD=accountserviceadmin
ACCOUNT_SERVICE_PORT=8081

DEPOSIT_DB_USER=deposit_service_admin
DEPOSIT_DB_PASSWORD=depositserviceadmin
DEPOSIT_SERVICE_PORT=8080

CONFIG_SERVICE_PORT=8001
DISCOVERY_SERVICE_PORT=8761
NOTIFICATION_SERVICE_PORT=9999
GATEWAY_SERVICE_PORT=8989

# Security
SPRING_SECURITY_USER=user
SPRING_SECURITY_PASSWORD=bankconfigadmin123

# Business Logic Config
DEPOSIT_MIN_AMOUNT=10.00

# Mail Configuration
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=email@gmail.com
MAIL_PASSWORD=app-password
```

### 4. Запуск через Docker Compose

```bash
docker-compose up --build
```

Docker Compose автоматически поднимет базу данных, инициализирует пользователей и запустит все микросервисы с Healthchecks.

### 5. Доступ к интерфейсам

* Eureka Dashboard: [http://localhost:8761](http://localhost:8761)
* API Gateway: [http://localhost:8989](http://localhost:8989)
* PostgreSQL: [http://localhost:5433](http://localhost:5433)
* Frontend: [http://localhost:3000](http://localhost:3000)

### 6. Добавить hostname Keycloak (необязательно)

Браузер и сервисы должны видеть Keycloak под одним и тем же именем, иначе iss в токене не совпадёт с issuer-uri.
Добавьте в файл hosts строку:

```text
127.0.0.1 keycloak.localhost
```

* Windows: C:\Windows\System32\drivers\etc\hosts (редактор от администратора)
* Linux / macOS: /etc/hosts

---

## 🔮 Планы по развитию (Roadmap)

~~* **Security**: JWT авторизация, OAuth2 Resource Server~~
* **Caching**: Redis для кеширования
* **Orchestration**: Kubernetes (K8s) + Helm Charts
* **Messaging**: DLQ / Outbox / idempotency для RabbitMQ-сценариев
* **Observability**: ELK Stack или Prometheus + Grafana
* **Saga Pattern**: Распределенные транзакции

---

## 👨‍💻 Автор

Разработчик: KirillShilets

Проект создан в образовательных целях для демонстрации навыков работы с микросервисной архитектурой на Spring Boot.
