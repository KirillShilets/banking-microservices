# 🔎 Discovery Service

Eureka Server для регистрации и обнаружения Spring-сервисов.

## 🧭 Роль в системе

account-service, bill-service, deposit-service, notification-service и gateway-service регистрируются в Eureka. Gateway использует имена сервисов для маршрутизации через lb://service-name.

## 🚀 Запуск

- порт: 8761;
- приложение: org.bank.discovery.DiscoveryApplication;
- Eureka Dashboard: http://localhost:8761;
- health: http://localhost:8761/actuator/health.

~~~powershell
.\gradlew.bat :discovery-service:bootRun
~~~

Сервис обычно запускается после успешного healthcheck Config Server.

## 🧪 Тесты

~~~powershell
.\gradlew.bat :discovery-service:test
~~~
