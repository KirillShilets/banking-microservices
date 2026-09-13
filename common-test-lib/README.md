# 🧪 Common Test Library

Общая тестовая инфраструктура для модулей проекта.

## 🧰 Что предоставляет

- JUnit 5 и Spring Boot Test;
- Spring Security Test;
- Testcontainers и PostgreSQL container;
- общая конфигурация подключения integration-тестов к PostgreSQL.

Основная аннотация — EnablePostgresTestConfiguration.

## ⚠️ Требования

Integration-тесты требуют работающий Docker Engine, потому что PostgreSQL запускается в Testcontainer.

## ✅ Проверка

~~~powershell
.\gradlew.bat :common-test-lib:test
~~~

Модуль является библиотекой и не запускает отдельный контейнер в Docker Compose.
