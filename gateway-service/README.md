# 🚪 Gateway Service

Единая внешняя точка входа в backend. Сервис построен на Spring Cloud Gateway WebFlux. В Kubernetes маршруты идут по Kubernetes DNS (`gateway-service-kubernetes.yml`), а `lb://service-name` через Eureka используется только при локальном запуске.

## 🛣️ Маршруты

| Путь | Целевой сервис |
|---|---|
| /accounts/** | account-service |
| /bills/** | bill-service |
| /deposits/** | deposit-service |

Notification Service работает только через RabbitMQ и отдельного публичного маршрута не имеет.

## ✨ Возможности

- JWT-проверка через Keycloak (профиль `kubernetes` проверяет `audiences: banking-frontend`);
- маршрутизация через `lb://service-name` (локально) и по Kubernetes DNS (в кластере);
- CORS: `http://app.localhost` в профиле `kubernetes`, `localhost:3000` и `localhost:5173` — для локального запуска;
- единый JSON-формат ошибок;
- Actuator и Resilience4j-зависимости.

## 🚀 Запуск

- порт: 8989 (наружу публикуется только Ingress `http://api.localhost`);
- health: /actuator/health;
- конфигурация маршрутов: `config-service/src/main/resources/services/gateway-service.yml` (локально) и `gateway-service-kubernetes.yml` (в кластере).

~~~powershell
.\gradlew.bat :gateway-service:bootRun
~~~

В обычном сценарии запускать Gateway нужно после Config Server, Eureka, Keycloak и бизнес-сервисов.

## 🔗 Пример запроса

~~~http
GET http://api.localhost/accounts/me
Authorization: Bearer <access-token>
~~~

При локальном запуске без кластера тот же запрос идёт на `http://localhost:8989`.

## 🧪 Тесты

~~~powershell
.\gradlew.bat :gateway-service:test
~~~
