# Discovery Service (Eureka Server)

**Discovery Service** — центральный **Eureka Server**, обеспечивающий регистрацию и обнаружение всех микросервисов в системе банка.

Сервис работает в **standalone-режиме**: не регистрируется сам и не запрашивает registry, что идеально для единственного центрального Discovery-узла.

---

## 🚀 Основной функционал

* Eureka Server (Standalone Mode)
* Интеграция с Spring Cloud Config
* Actuator эндпоинты (`/actuator/health`, `/actuator/info`)
* Простое веб-UI для мониторинга (Eureka Dashboard)
* Полная готовность для Docker/Kubernetes
* Высокая отказоустойчивость при запуске и конфигурации

---

## 🧩 Архитектура

### Основные компоненты

* **Eureka Server** — регистрация и discovery сервисов
* **Spring Boot Actuator** — health и info эндпоинты
* **Spring Cloud Config** — централизованная конфигурация
* **Standalone Mode** — сервис не пытается регистрироваться в сам себе
* **Docker-ready** — легкий контейнер для локального или кластерного запуска

---

## 📦 Конфигурация

### application.yml

```yaml
spring:
  application:
    name: discovery-service
  config:
    import: "configserver:http://${SPRING_SECURITY_USER}:${SPRING_SECURITY_PASSWORD}@config-service:8001"

cloud:
  config:
    fail-fast: true

eureka:
  instance:
    prefer-ip-address: true
  client:
    register-with-eureka: false
    fetch-registry: false
  server:
    wait-time-in-ms-when-sync-empty: 0
    peer-node-read-timeout-ms: 100000
```

### application-test.yml

```yaml
spring:
  application:
    name: discovery-service-test

cloud:
  config:
    enabled: false

eureka:
  client:
    register-with-eureka: false
    fetch-registry: false
```

---

## 🌍 Эндпоинты

### Eureka Dashboard

```
GET http://localhost:8761/
```

### Actuator

```
GET http://localhost:8761/actuator/health
GET http://localhost:8761/actuator/info
```

---

## 🧪 Тестирование

### ✔ Unit и Integration тесты

* Проверка загрузки контекста и наличия Eureka Server bean-ов
* Health check через Actuator
* Доступность Eureka Dashboard UI
* Проверка standalone-конфигурации

Пример:

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class DiscoveryApplicationTests {

    @Autowired
    private ApplicationContext applicationContext;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private Environment environment;

    @Test
    void contextLoads() {
        assertThat(applicationContext.containsBean("eurekaServerContext")).isTrue();
    }

    @Test
    void healthCheck() {
        ResponseEntity<String> entity = restTemplate.getForEntity("/actuator/health", String.class);
        assertThat(entity.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(entity.getBody()).contains("\"status\":\"UP\"");
    }

    @Test
    void eurekaDashboardLoads() {
        ResponseEntity<String> entity = restTemplate.getForEntity("/", String.class);
        assertThat(entity.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(entity.getBody()).contains("System Status");
    }

    @Test
    void checkStandaloneConfiguration() {
        Boolean register = environment.getProperty("eureka.client.register-with-eureka", Boolean.class);
        Boolean fetch = environment.getProperty("eureka.client.fetch-registry", Boolean.class);
        assertThat(register).isFalse();
        assertThat(fetch).isFalse();
    }
}
```

Запуск тестов:

```bash
./gradlew test
```

---

## 🐳 Docker

### Сборка образа

```bash
docker build -t bank-discovery-service .
```

### Запуск контейнера

```bash
docker run -d \
  -p 8761:8761 \
  -e SPRING_SECURITY_USER=admin \
  -e SPRING_SECURITY_PASSWORD=secret \
  bank-discovery-service
```

---

## ▶️ Локальный запуск

```bash
./gradlew clean bootRun
```

Если Config Server защищён Basic Auth:

```
SPRING_SECURITY_USER=admin
SPRING_SECURITY_PASSWORD=secret
```

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

## 🧱 Структура проекта

```
discovery-service
 ├── src/main/java/org/bank/discovery/
 │     └── DiscoveryApplication.java
 ├── src//resources/
 │     └── application.yml
 ├── build.gradle
 ├── Dockerfile
 └── README.md
```

---

## 🧰 Используемые технологии

* Java 17
* Spring Boot 3.5.6
* Spring Cloud Eureka Server
* Spring Cloud Config
* Actuator
* JUnit 5
* Docker

---