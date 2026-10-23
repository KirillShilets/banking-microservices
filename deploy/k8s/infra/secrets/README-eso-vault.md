# ESO + Vault (self-hosted, Kubernetes auth) — установка и настройка

Блок H спецификации CI/CD. Секреты окружений staging/prod живут в Vault и
попадают в кластер только через External Secrets Operator — файловые `.env` и
`create-secrets` для этих окружений больше не используются.

## 1. Установка Vault (HA, не dev-режим)

Dev-режим (`vault server -dev`) хранит всё в памяти и работает с root-токеном —
для банковского домена не подходит. Ниже — production-путь.

### 1.1 Установка через Helm (HA-режим)

~~~bash
helm repo add hashicorp https://helm.releases.hashicorp.com
helm repo update

helm upgrade --install vault hashicorp/vault \
  -n vault --create-namespace \
  --version 0.28.1 \
  --set "server.ha.enabled=true" \
  --set "server.ha.replicas=3" \
  --set "server.dataStorage.enabled=true" \
  --set "server.datastorage.size=10Gi" \
  --set "server.standalone.enabled=false" \
  --set "server.dev.enabled=false" \
  --set "injector.enabled=false"
~~~

Дальше — инициализация:

~~~bash
# Инициализация с 5 key shares / порогом 3
kubectl -n vault exec -it vault-0 -- vault operator init \
    -key-shares=5 -key-threshold=3 -format=json > vault-init.json

# Unseal каждого пода тремя ключами
for i in 0 1 2; do
  vault operator unseal "$(jq -r ".unseal_keys_b64[$i]" vault-init.json)"
done
~~~

Unseal-ключи и initial root token — в менеджер секретов, НЕ в репозиторий.

### 1.2 Kubernetes auth

~~~bash
# Включаем auth backend
vault auth enable kubernetes

vault write auth/kubernetes/config \
  kubernetes_host="https://kubernetes.default.svc"

# Роль для ESO: токен ServiceAccount external-secrets-sa из банковских ns
vault write auth/kubernetes/role/bank-apps \
  bound_service_account_names=external-secrets-sa \
  bound_service_account_namespaces=bank-staging,bank-prod \
  policies=bank-secrets \
  ttl=1h

# Политика на чтение только своего пути
vault policy write bank-secrets - <<EOF
path "kv/data/bank/staging/*" { capabilities = ["read"] }
path "kv/data/bank/prod/*"   { capabilities = ["read"] }
EOF

# Засеять секреты (однократно, из доверенного места)
vault kv put secret/bank/staging/app-secrets \
  account_db_user=account_service_admin \
  account_db_password=... \
  rabbitmq_username=bankmq \
  ...
~~~

### 1.3 CA-сертификат Vault для ESO

~~~bash
kubectl -n bank-staging create secret generic vault-ca-cert \
  --from-file=ca.crt=<путь к CA Vault> \
  --dry-run=client -o yaml | kubectl apply -f -
~~~

### 1.4 External Secrets Operator

~~~bash
helm repo add external-secrets https://charts.external-secrets.io
helm upgrade --install external-secrets external-secrets/external-secrets \
  -n external-secrets-system --create-namespace \
  --set installCRDs=true
~~~

## 2. Настройка ServiceAccount для ESO

В обоих namespace (`bank-staging`, `bank-prod`) должен существовать
ServiceAccount `external-secrets-sa` — на него завязан Vault k8s-auth:

~~~bash
kubectl -n bank-staging create sa external-secrets-sa --dry-run=client -o yaml | kubectl apply -f -
kubectl -n bank-prod create sa external-secrets-sa -o yaml --dry-run=client | kubectl apply -f -
~~~

## 3. Применение манифестов

~~~bash
kubectl apply -f deploy/k8s/infra/secrets/secretstore-vault.yaml
kubectl apply -f deploy/k8s/infra/secrets/external-secret-app.yaml

# Проверка
kubectl -n bank-staging describe externalsecret bank-app-secrets
kubectl -n bank-staging get secret bank-app-secrets -o jsonpath='{.data.ACCOUNT_DB_USER}' | base64 -d
~~~

## 4. Argo CD

ESO-ресурсы лучше держать как отдельные Argo CD Application (не внутри чарта
`bank`), чтобы смена секретов не смешивалась с релизами приложения:

~~~yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: eso-secrets
  namespace: argocd
spec:
  project: bank
  source:
    repoURL: https://github.com/kirillshilets/spring-cloud-banking-system.git
    targetRevision: main
    path: deploy/k8s/infra/secrets
  destination:
    server: https://kubernetes.default.svc
    namespace: bank-staging
  syncPolicy:
    syncOptions: [CreateNamespace=true]
~~~

## 5. Очистка legacy

После переключения окружений на ESO:
- файловые `.env` / `create-secrets.ps1` остаются только для локального kind-запуска;
- секреты staging/prod больше не проходят через CI, `.env` в историях раннеров;
- ротация паролей: правим значение в Vault — ESO раз в `refreshInterval` синкнет
  Secret, а для баз с лейблом `cnpg.io/reload=true` CNPG подхватит новый пароль.
