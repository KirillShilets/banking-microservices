# ⚙️ Config Service

Централизованный Spring Cloud Config Server. Он отдает конфигурацию сервисов из src/main/resources/services и из смонтированной Docker-директории /app/config.

## 🗂️ Конфигурация

Файлы сервисов:

~~~text
config-service/src/main/resources/services/
├── application.yml
├── account-service.yml
├── bill-service.yml
├── deposit-service.yml
├── discovery-service.yml
├── gateway-service.yml
└── notification-service.yml
~~~

Общие настройки находятся в services/application.yml, настройки конкретного сервиса — в одноименном файле.

## 🚀 Запуск

- порт: 8001;
- профиль: native;
- Basic Auth задается переменными SPRING_SECURITY_USER_NAME и SPRING_SECURITY_PASSWORD;
- endpoint health: /actuator/health.

~~~powershell
.\gradlew.bat :config-service:bootRun
~~~

Обычно сервис запускается через корневой Compose-файл:

~~~powershell
docker compose up -d --build config-service
~~~

## ⚠️ Важно

Изменение файлов в services требует перезапуска зависимых сервисов, потому что они загружают конфигурацию при старте.

## 🧪 Тесты

~~~powershell
.\gradlew.bat :config-service:test
~~~
