# Gateway Service

**Gateway Service** — API-шлюз для всей микросервисной системы.
Основан на **Spring Cloud Gateway (WebFlux)** и выполняет роль единой точки входа, маршрутизации запросов, обработки ошибок и интеграции с Config Server и Eureka Discovery.

Сервис полностью реактивный (Netty), поддерживает фильтры, глобальную обработку ошибок и fault-tolerance при помощи **Resilience4j**.

---

## 🚀 Основной функционал

* Маршрутизация запросов к backend-микросервисам
* Интеграция с Eureka Service Discovery
* Обработка всех ошибок на уровне API Gateway
* Глобальный WebFlux-Exception Handler (Unified JSON Error Response)
* Интеграция с Spring Cloud Config
* Поддержка resilience-паттернов (CircuitBreaker)
* Health/Actuator эндпоинты
* Полная реактивность (WebFlux + Netty)

---

## 🧩 Архитектура

### Основные компоненты

* **Spring Cloud Gateway** — маршрутизация, фильтры, rewrite, predicates
* **WebFlux** — реактивный стек
* **GlobalWebFluxExceptionHandler** — глобальная обработка ошибок
* **Eureka Client** — для service discovery
* **Resilience4j** — circuit breaker
* **Spring Cloud Config** — централизованные конфиги
* **Integration Tests** — проверка маршрутов и ошибок

---

## 📦 Конфигурация

Фрагмент `application.yml`:

```yaml
spring:
  application:
    name: gateway-service
  config:
    import: "configserver:http://${SPRING_SECURITY_USER}:${SPRING_SECURITY_PASSWORD}@config-service:8001"
  cloud:
    config:
      fail-fast: true
```

В боевой среде конфигурация маршрутов находится на Config Server — это позволяет централизованно управлять gateway-правилами.

---

## 🔒 Глобальная обработка ошибок

Реализована в `GlobalWebFluxExceptionHandler`.

Формат ответа:

```json
{
  "message": "Resource missing",
  "status": 404,
  "timestamp": "2025-01-01T10:10:00"
}
```

Обработчик работает для:

* `ResponseStatusException` — проброс статуса
* всех других ошибок — возвращает `500 Internal Server Error`
* гарантирует JSON-ответ (WebFlux DataBuffer)

---

## 🧱 Структура проекта

```
gateway-service
 ├── exception
 │     ├── GlobalWebFluxExceptionHandler.java
 │     └── dto/ErrorResponseDTO.java
 ├── integration
 │     └── GatewayIntegrationTest.java
 ├── GatewayApplication.java
 ├── build.gradle
 ├── Dockerfile
 └── resources
```

---

## 🔧 Dockerfile

Проект собирается через **Gradle multi-stage build**, затем запускается на Alpine-based JRE:

```
FROM gradle:8.10.2-jdk17-alpine AS builder
...
FROM eclipse-temurin:17-jre-alpine
```

Легковесное и оптимизированное окружение.

---

## 🧪 Тестирование

### ✔ Unit-тесты

* `GlobalWebFluxExceptionHandlerUnitTest`
* Проверка корректности статусов, JSON-ответа, сериализации

### ✔ Интеграционные тесты

`GatewayIntegrationTest`:

* проверка поведения при несуществующих маршрутах
* проверка JSON-ошибки
* запуск на случайном порту (RANDOM_PORT)

Пример:

```java
webTestClient.get().uri("/non-existent-route-12345")
    .exchange()
    .expectStatus().isNotFound()
    .expectHeader().contentType(MediaType.APPLICATION_JSON)
    .expectBody()
    .jsonPath("$.status").isEqualTo(404);
```

---

## 🚦 Запуск

### 1. Сборка

```
gradle clean bootJar
```

### 2. Запуск

```
java -jar app.jar
```

Gateway автоматически:

* подтянет конфигурацию из Config Server
* зарегистрируется в Eureka
* применит правила маршрутизации

---

## 📡 Взаимодействие с другими сервисами

Gateway выступает **единым входом** ко всем микросервисам:

* `bill-service`
* `account-service`
* `deposit-service`
* `notification-service`
* и др.

Взаимодействие осуществляется через **Spring Cloud Gateway → Eureka Discovery → HTTP**.

Преимущества:

* никаких прямых URL внутри сервисов
* автоматическое обновление маршрутов при изменении регистрации
* fault tolerance через Resilience4j

---

## 🧰 Используемые технологии

* Java 17
* Spring Boot 3.5.6
* Spring Cloud Gateway WebFlux
* Spring Cloud Config
* Spring Cloud Netflix Eureka Client
* Resilience4j
* JUnit 5, Reactor Test
* Lombok
* Gradle

---