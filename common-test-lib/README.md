# Common Test Library (`common-test-lib`)

`common-test-lib` — общая библиотека для поддержки тестов микросервисов банка.
Обеспечивает конфигурацию для интеграционных и unit тестов с использованием PostgreSQL через Testcontainers.

---

## 📁 Структура проекта

```
common-test-lib/
│
├── src/main/java/org/bank/config/
│   └── PostgresTestConfiguration.java     # Настройка PostgreSQL Testcontainer
│
├── src/main/java/org/bank/config/annotation/
│   └── EnablePostgresTestConfiguration.java  # Аннотация для импорта конфигурации
│
├── build.gradle
└── README.md
```

---

## ⚙️ Конфигурация

### PostgresTestConfiguration

* Поднимает контейнер PostgreSQL 16-alpine через Testcontainers
* Поддержка повторного использования контейнера (`withReuse(true)`)
* Временная файловая система (`withTmpFs`) для ускорения работы тестов
* Помечен как `@TestConfiguration` для автоматической интеграции в Spring Boot тесты

### EnablePostgresTestConfiguration

* Аннотация `@EnablePostgresTestConfiguration` позволяет легко подключить конфигурацию контейнера в тестах микросервисов:

```java
@SpringBootTest
@EnablePostgresTestConfiguration
class DepositServiceIntegrationTest {
    ...
}
```

---

## 📦 Сборка

Используется Gradle как `java-library`:

```bash
./gradlew clean build
```

Собранный jar можно подключать к любому микросервису для интеграционных тестов с PostgreSQL.

---

## 🧩 Особенности

* Поддержка Spring Boot 3.5.6
* Полная интеграция с Testcontainers и Spring Boot Test
* Позволяет создавать изолированные интеграционные тесты с PostgreSQL
* Повторное использование контейнеров ускоряет тесты
* Минимальная конфигурация для подключения: достаточно аннотации `@EnablePostgresTestConfiguration`

---

## 🧪 Тесты

Библиотека сама не содержит бизнес-логики, но используется в тестах микросервисов для:

* поднятия изолированной базы PostgreSQL
* интеграционных тестов репозиториев и сервисов
* автоматизации setup/teardown контейнеров

Запуск тестов:

```bash
./gradlew test
```
