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
- Spring Boot 3.5.15;
- Spring Cloud 2025.0.3;
- Gradle multi-module;
- Spring Cloud Gateway WebFlux;
- Spring Security OAuth2 Resource Server;
- Keycloak 26.8 (Keycloak Operator);
- PostgreSQL 16, Spring Data JPA, Liquibase;
- RabbitMQ;
- React 19, TypeScript, Vite и Axios;
- JUnit 5, Mockito и Testcontainers;
- Kubernetes, Helm и Helm Operators.

## 🚀 Быстрый запуск

### ✅ Требования

- Docker Desktop с включенным Docker Engine;
- Java 17 для запуска Gradle-тестов локально;
- Node.js 22+ — только для локальной разработки frontend;
- kubectl, Helm и kind;
- PowerShell — скрипты развёртывания написаны на PowerShell;
- свободные порты 80 и 443 на хосте: ingress-nginx публикуется именно на них.

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

Зона `.localhost` относится к secure context, поэтому OIDC-вход с PKCE работает без HTTPS и без правки hosts. Если `app.localhost` не отвечает (пустой ответ, обрыв соединения), значит порты ingress не доехали до хоста: как это диагностировать и починить без пересоздания кластера — раздел Troubleshooting в [deploy/README.md](deploy/README.md).

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

Базовый URL — http://api.localhost (внутри кластера Gateway слушает порт 8989, наружу публикуется только Ingress). Все защищенные запросы выполняются с заголовком:

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

Пополнение требует `APP_SANDBOX_DEPOSITS_ENABLED=true` (свойство `app.sandbox.deposits-enabled`) и суммы не меньше `DEPOSIT_MIN_AMOUNT`.

Пополнение — денежная операция, поэтому клиент обязан передать заголовок `Idempotency-Key` (до 128 символов):

- повтор с тем же ключом и тем же телом возвращает сохранённый ответ и **не** зачисляет сумму второй раз;
- тот же ключ с другим телом — `422 Unprocessable Entity`;
- запрос с этим ключом уже выполняется — `409 Conflict`;
- тот же ключ после неудачной попытки можно использовать снова: попытка снимает claim.

Ключ должен выражать намерение пользователя, а не сетевой вызов: интерфейс хранит его для текущей суммы и меняет при изменении суммы.


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

`.env` (шаблон — `.env.example`) содержит только значения, из которых bootstrap создаёт Kubernetes Secrets:

- пароли ролей PostgreSQL сервисов и базы Keycloak;
- логин и пароль RabbitMQ;
- логин и пароль SMTP.

Остальные параметры задаются не через `.env`:

- `DEPOSIT_MIN_AMOUNT` — значение по умолчанию 2.60 задано в конфигурации bill-service и переопределяется одноимённой переменной окружения;
- `APP_SANDBOX_DEPOSITS_ENABLED` — включает sandbox-пополнение; в kind выставлен в `helm/bank-platform/values-kind.yaml`;
- `MAIL_HOST` и `MAIL_PORT` — там же, в `values-kind.yaml`.

Настройки Spring-сервисов для Kubernetes находятся в `config-service/src/main/resources/services` и зеркалируются в ConfigMap Helm-чарта. Изменения синхронизируются командой `powershell -File deploy/scripts/sync-config.ps1`.

## 🧪 Проверка проекта

Backend:

~~~powershell
.\gradlew.bat test
~~~



Unit- и интеграционные тесты разделены тегами JUnit: ./gradlew test — быстрые unit-тесты без Docker, ./gradlew integrationTest — Spring-контекст и Testcontainers (нужен работающий Docker Engine), ./gradlew check — оба набора плюс SpotBugs, Spotless и coverage-гейт.


Frontend:

~~~powershell
cd frontend
npm ci
npm run lint
npm test -- --run
npm run build
~~~

### 🧍 Проверка как клиент

Полный стек (нужен развёрнутый кластер из шага 3):

1. откройте http://app.localhost — браузер уведёт на страницу входа Keycloak;
2. войдите тестовым пользователем из таблицы «Тестовые пользователи Keycloak» выше;
3. при первом входе профиля ещё нет: создайте аккаунт и выберите 1–20 счетов. Счета открывает bill-service асинхронно, интерфейс сам дождётся их появления;
4. дальше доступны Главная, Платежи, История, Счета, Кэшбэк и Профиль. Sandbox-пополнение и проверка депозита по ID видны ролям employee и admin.

Только интерфейс, без Keycloak и Java-сервисов (demo-режим на MSW):

~~~powershell
cd frontend
npm run dev
~~~

http://localhost:5173 поднимается с `VITE_DEMO_MODE=true` и `VITE_ENABLE_MOCKS=true` из `.env.development`: MSW отвечает по тем же путям, данные лежат в `localStorage`, роль переключается в Профиль → Демо-роли. Как направить dev-сервер на реальный Gateway и Keycloak, описано в [frontend/README.md](frontend/README.md).

## 🚀 CI/CD: production-пайплайн

 Полный пайплайн описан в `.github/workflows/`;

 ### Quality gates (обязательные для merge/release)

 - **Backend**: `./gradlew clean check` (unit + integration с Testcontainers, SpotBugs c `ignoreFailures=false`, Spotless, JaCoCo gate 60% строк на деплоящихся сервисах);
 - **Frontend**: `npm ci`, eslint, vitest с coverage-порогами, `npm audit --omit=dev --audit-level=high`, build;
 - **SonarQube**: analysis для backend и frontend, ожидание Quality Gate (`sonar.qualitygate.wait=true`), fail-closed при отсутствии `SONAR_HOST_URL`/`SONAR_TOKEN`;
 - **Security**: Gitleaks (вся история), CodeQL (Java + TS), runtime SBOM (CycloneDX) + Trivy SBOM (MEDIUM/HIGH/CRITICAL с фиксами), Trivy filesystem HIGH/CRITICAL, Checkov (rendered-манифесты Kubernetes);
 - **Static/структура**: hadolint, ShellCheck, actionlint (с проверкой checksum), yamllint, `deploy/ci/repository-preflight.sh`;
 - **Helm/K8s**: `helm lint` всех values, render комбинаций Argo (kind/staging/prod), kubeconform `-strict`, запрет placeholder-значений в staging/prod output.

 ### Необходимая настройка GitHub

 - Secrets используются `SONAR_HOST_URL`, `SONAR_TOKEN` (и `BOT_TOKEN` для release-please);
 - Variables: `SONAR_PROJECT_KEY` (опционально);
 - Environments: `staging`, `production` — для production включить required reviewers и защиту от обхода;
 - Branch protection на `main`: required status check **CI gate** + review (см. `deploy/ci/protect-main.sh`).

 ### Release / promotion flow

 1. merge в `main` → release-please создаёт PR с bump версии и тег `v*`;
 2. `release.yml`: guard-проверка (тег = HEAD main), сборка образов по SHA, сканирование опубликованного digest, подпись Cosign keyless, аттестация provenance/SBOM, тег `v*` → тот же digest;
 3. `promote.yml`: staging — PR с digest в `values-staging.yaml`; production — после approval environment, digest в `values-prod.yaml` и push в ветку `promote/prod`, которую отслеживает Argo CD;
 4. Argo CD: staging `automated` (prune + selfHeal); prod — ручная синхронизация.

 ### Известные ограничения

 - `values-managed.yaml` — scaffold управляемой среды (инфраструктурные имена должны быть заменены до реального go-live);
 - prod-значения используют `example.com`-домены: заменить на реальные перед внешней публикацией.

## 🗂️ Структура репозитория

~~~text
account-service/       аккаунты и владельцы аккаунтов
bill-service/          счета, баланс, outbox и sandbox-пополнения
deposit-service/       история депозитов
notification-service/  email-уведомления
gateway-service/       внешний API Gateway
config-service/        исходные конфигурации; для Kubernetes используется ConfigMap
security-lib/          общая JWT-конфигурация и роли
common-lib/            DTO, исключения и RabbitMQ topology
common-test-lib/       общая тестовая инфраструктура
frontend/              React-клиент
keycloak/import/       realm и demo-пользователи
deploy/k8s/infra/      операторы и манифесты PostgreSQL, RabbitMQ, Keycloak и MinIO
docs/adr/              архитектурные решения и компромиссы
docs/deposit-sequence.md  сценарий пополнения и точки отказа
SECURITY.md            политика безопасности и границы доверия
postman/               заготовки для Postman
~~~

## 🔮 Планы по развитию (Roadmap)

Сделано (оставлено для истории):

- ~~Security: JWT авторизация, OAuth2 Resource Server~~;
- ~~Messaging: DLQ, transactional outbox, идемпотентность consumer'ов~~;
- ~~Идемпотентность HTTP-пополнения по `Idempotency-Key`~~;
- ~~Orchestration: Kubernetes и Helm, операторы PostgreSQL/RabbitMQ/Keycloak~~;
- ~~Backups: регулярные backup PostgreSQL в S3-совместимое хранилище~~.

Дальше по приоритету:

1. **Проверяемое восстановление PostgreSQL** — backup есть, restore-drill нет.
2. **Observability** — Prometheus + Grafana, JSON-логи, trace id в ответах об ошибке.
3. **Кеширование** — Redis для чтения счетов (сейчас каждый запрос идёт в базу).
4. **Rate limiting** на Gateway и лимиты размера запроса.
5. **Деньги строкой в JSON** и валюта как атрибут счёта (см. ADR 0002).
6. **OpenAPI + генерация TS-типов** вместо ручных DTO во фронтенде.

Ограничения курса проекта (изучаем), см. раздел «Известные ограничения».

Архитектурные решения и их компромиссы описаны в [docs/adr](docs/adr), сценарий
пополнения с точками отказа — в [docs/deposit-sequence.md](docs/deposit-sequence.md).

## ⚠️ Известные ограничения

- проект предназначен для учебного и локального использования;
- demo-пароли нельзя использовать в production (см. [SECURITY.md](SECURITY.md));
- email требует доступного SMTP-сервера и корректного app password;
- внешняя публикация сервисов напрямую, обходя Gateway, не является целевым сценарием;
- физическое удаление аккаунтов и счетов не поддерживается: операция закрытия
  счёта не реализована, `DELETE`-эндпоинтов нет, а историческая очередь удаления
  счетов только отклоняет сообщения;
- демо-сессия и in-browser API (MSW) собираются только в dev-сборке
  (`import.meta.env.DEV`); в production-образ они не попадают;
- внутренняя RabbitMQ-команда запроса аккаунта отдаёт ПДн (email, телефон) любому,
  у кого есть доступ к брокеру — сужение до `owner_subject` запланировано;
- сообщения `FAILED` в outbox не ретраятся и требуют ручного разбора; по ним
  пишется ошибка в лог, но алертинга пока нет.

## 👨‍💻 Автор

Разработчик: KirillShilets
