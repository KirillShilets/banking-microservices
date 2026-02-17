# Config Service

**Config Service** — централизованный Spring Cloud Config Server для всех микросервисов банка.
Обеспечивает хранение и предоставление конфигураций через HTTP API с поддержкой Basic Auth.

---

## 🚀 Основной функционал

* Централизованное хранение конфигураций для всех микросервисов
* Работа в режиме **native** (чтение конфигураций из `classpath:/services/` или файловой системы)
* Basic Auth для доступа к конфигурациям
* Публичные Actuator эндпоинты `/actuator/health`, `/actuator/info`
* Поддержка Spring Cloud Bus (опционально)
* Готов к запуску в Docker

---

## 🧩 Архитектура

### Основные компоненты

* **Application** — точка входа (`ConfigApplication`)
* **SecurityConfig** — настройка Basic Auth и открытых эндпоинтов
* **Resources** — конфигурации микросервисов в `classpath:/services/`
* **Spring Cloud Config** — выдача конфигураций по HTTP
* **Actuator** — мониторинг состояния сервиса

---

## 📦 Структура проекта

```
config-service
 ├── src/main/java/org/bank/config/
 │     ├── ConfigApplication.java
 │     └── security/SecurityConfig.java
 ├── src/main/resources/
 │     ├── application.yml
 │     └── services/
 │         ├── account-service.yml
 │         ├── application.yml
 │         ├── bill-service.yml
 │         ├── deposit-service.yml
 │         ├── discovery-service.yml
 │         ├── gateway-service.yml
 │         └── notification-service.yml
 ├── build.gradle
 ├── Dockerfile
 └── README.md
```

---

## ⚙️ Конфигурация приложения

### application.yml

```yaml
spring:
  cloud:
    config:
      server:
        native:
          search-locations: classpath:/services/, file:./config/
  profiles:
    active: native

security:
  user:
    name: ${SPRING_SECURITY_USER}
    password: ${SPRING_SECURITY_PASSWORD}

management:
  endpoints:
    web:
      exposure:
        include: health,info
  endpoint:
    health:
      show-details: always

server:
  port: 8001
```

---

## 🔐 Безопасность

* Basic Auth для всех запросов
* Публичные эндпоинты:

  * `/actuator/health`
  * `/actuator/info`

---

## 🌍 REST API

### Получение конфигурации

```
GET http://localhost:8001/{application}/{profile}
GET http://localhost:8001/{application}-{profile}.yml
```

Пример:

```
GET http://localhost:8001/account-service/default
```

---

## 🐳 Docker

### Сборка образа

```bash
docker build -t bank-config-service .
```

### Запуск контейнера

```bash
docker run -d \
  -p 8001:8001 \
  -e SPRING_SECURITY_USER=admin \
  -e SPRING_SECURITY_PASSWORD=secret \
  bank-config-service
```

---

## ▶️ Локальный запуск

```bash
./gradlew clean bootRun
```

Переменные окружения для Basic Auth:

```
SPRING_SECURITY_USER=admin
SPRING_SECURITY_PASSWORD=secret
```

---

## 🧪 Тестирование

JUnit тест:

```java
@SpringBootTest
@ActiveProfiles("native")
class ConfigApplicationTests {
    @Autowired
    private ApplicationContext applicationContext;

    @Test
    @DisplayName("Context should load successfully")
    void contextLoads() {
        assertThat(applicationContext).isNotNull();
    }
}
```

Запуск тестов:

```bash
./gradlew test
```

---

## 🧷 Конфигурации микросервисов

Каждый YAML-файл в `src/main/resources/services` соответствует отдельному микросервису:

* `account-service.yml`
* `bill-service.yml`
* `deposit-service.yml`
* `discovery-service.yml`
* `gateway-service.yml`
* `notification-service.yml`

Формат поддерживается Spring Cloud Config Server по умолчанию.

---

## 📦 Билд

```bash
./gradlew clean bootJar
```

Собранный Jar:

```
build/libs/app.jar
```

---

## 🔍 Полезные команды

* Проверка зависимостей:

```bash
./gradlew dependencies
```

* Просмотр дерева конфигураций:

```bash
tree src/main/resources/services
```

---

## 🧰 Используемые технологии

* Java 17
* Spring Boot 3.5.6
* Spring Cloud Config Server 2025.0.0
* Spring Security (Basic Auth)
* Spring Boot Actuator
* Docker

---
