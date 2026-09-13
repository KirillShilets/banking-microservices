# 🚪 Gateway Service

Единая внешняя точка входа в backend. Сервис построен на Spring Cloud Gateway WebFlux и маршрутизирует запросы к бизнес-сервисам через Eureka.

## 🛣️ Маршруты

| Путь | Целевой сервис |
|---|---|
| /accounts/** | account-service |
| /bills/** | bill-service |
| /deposits/** | deposit-service |

Notification Service работает только через RabbitMQ и отдельного публичного маршрута не имеет.

## ✨ Возможности

- JWT-проверка через Keycloak;
- маршрутизация через lb://service-name;
- CORS для frontend на localhost:3000 и localhost:5173;
- единый JSON-формат ошибок;
- Actuator и Resilience4j-зависимости.

## 🚀 Запуск

- порт: 8989;
- health: /actuator/health;
- конфигурация маршрутов: config-service/src/main/resources/services/gateway-service.yml.

~~~powershell
.\gradlew.bat :gateway-service:bootRun
~~~

В обычном сценарии запускать Gateway нужно после Config Server, Eureka, Keycloak и бизнес-сервисов.

## 🔗 Пример запроса

~~~http
GET http://localhost:8989/accounts/me
Authorization: Bearer <access-token>
~~~

## 🧪 Тесты

~~~powershell
.\gradlew.bat :gateway-service:test
~~~
