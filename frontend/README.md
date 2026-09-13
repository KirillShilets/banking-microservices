# Frontend

React-интерфейс банковской системы. Frontend проходит аутентификацию через Keycloak и отправляет API-запросы в Gateway.

## Возможности

- вход и выход через Keycloak;
- автоматическое обновление access token;
- работа с аккаунтами, счетами и депозитами;
- отображение ошибок backend;
- TypeScript DTO, синхронизированные с backend-контрактами.

## Технологии

- React 19;
- TypeScript 5.9;
- Vite 8;
- Axios;
- keycloak-js 26;
- Nginx в production-контейнере.

## Переменные окружения

Файлы .env.development и .env.production используют:

~~~env
VITE_KEYCLOAK_URL=http://keycloak.localhost:8080
VITE_KEYCLOAK_REALM=bank-realm
VITE_KEYCLOAK_CLIENT_ID=banking-frontend
VITE_GATEWAY_URL=http://localhost:8989
~~~

Перед входом в браузере должен разрешаться hostname keycloak.localhost через hosts-файл.

## Локальный запуск

~~~powershell
npm ci
npm run dev
~~~

Интерфейс будет доступен на http://localhost:5173.

## Проверка

~~~powershell
npm run lint
npm run build
~~~

## Docker

В корневом Compose frontend собирается через frontend/Dockerfile и доступен на http://localhost:3000:

~~~powershell
docker compose up -d --build frontend
~~~
