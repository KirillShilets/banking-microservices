## Описание

<!-- Кратко: что делает этот PR и зачем. -->

## Связанные задачи

<!-- Ссылки на issues, если есть (fixes #123). -->

## Изменения

- [ ] Backend (Java/Spring)
- [ ] Frontend (React/Vite)
- [ ] Helm-чарт / манифесты
- [ ] CI/CD (GitHub Actions, deploy/)
- [ ] Инфраструктура (k8s/infra, операторы)

## Проверка

- [ ] `./gradlew.bat check` прошёл
- [ ] `npm run lint && npm run test:coverage && npm run build` (если frontend)
- [ ] `helm lint helm/bank-platform` прошёл
- [ ] e2e-смоук в kind зелёный (если затрагивает deploy)

## Безопасность

- [ ] Секреты/пароли не попадают в git (используется ESO/Vault, `.env` не коммитится)
- [ ] Нет новых `REPLACE_ME`/примерных значений в production-конфигах (значения `values-prod.yaml`, `values-managed.yaml`)

## Миграции

<!-- Если менялась схема БД — опишите changeset, и что миграционный Job выполнит. -->
- [ ] Liquibase changeset добавлен, runtime-под `liquibase.enabled=false` не менялся в базовом `application.yml`
