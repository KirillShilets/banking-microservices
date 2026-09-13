# 🔐 Security Library

Общая security-конфигурация для servlet-сервисов и reactive Gateway.

## 🛡️ Функции

- OAuth2 Resource Server с проверкой JWT Keycloak;
- преобразование realm_access.roles в Spring authorities ROLE_admin, ROLE_employee и ROLE_customer;
- разрешение actuator health/info без авторизации;
- stateless security без HTTP-сессий;
- AuthenticatedUser для получения sub текущего JWT и проверки роли;
- CORS и OPTIONS-поддержка в reactive-конфигурации.

Поддерживаемые бизнес-роли:

~~~text
admin
employee
customer
~~~

## 🔌 Использование

Сервисы подключают библиотеку как project dependency:

~~~groovy
implementation project(':security-lib')
~~~

Параметры issuer, audience и JWKS приходят из общей конфигурации Config Server.

## 🛠️ Сборка

~~~powershell
.\gradlew.bat :security-lib:build
~~~

Библиотека не является самостоятельным приложением.
