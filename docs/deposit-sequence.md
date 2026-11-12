# Сценарий пополнения счёта: последовательность и точки отказа

Денежная операция с точки зрения API — один `POST`. С точки зрения системы —
пять шагов, каждый из которых может отказать отдельно.

```mermaid
sequenceDiagram
    autonumber
    participant C as Клиент (SPA)
    participant G as Gateway
    participant B as bill-service
    participant A as account-service
    participant DB as PostgreSQL (bill)
    participant R as RabbitMQ
    participant D as deposit-service
    participant N as notification-service

    C->>G: POST /bills/sandbox/deposits<br/>Idempotency-Key: k1
    G->>B: проксирование (JWT провалидирован и в Gateway)
    B->>B: Redis-style guard: claim(k1, hash) — INSERT ON CONFLICT DO NOTHING
    alt ключ уже завершён
        B-->>C: 200 + сохранённый ответ (без повторного зачисления)
    else тот же ключ, другой payload
        B-->>C: 422
    else другой запрос с этим ключом выполняется
        B-->>C: 409
    else ключ захвачен этим запросом
        B->>A: getAccount(accountId) — вне транзакции (email для уведомления)
        A-->>B: ownerSubject, email
        B->>B: авторизация по owner_subject (без сети)
        B->>DB: BEGIN
        B->>DB: SELECT … FOR UPDATE по bills
        B->>DB: UPDATE bills SET amount = amount + X
        B->>DB: INSERT outbox × 2 (DEPOSIT_CREATED, NOTIFICATION_CREATED)
        B->>DB: UPDATE idempotency_keys SET status = COMPLETED, response_body = …
        B->>DB: COMMIT
        B-->>C: 200 BillDepositResponseDTO
    end

    Note over B,DB: Отдельный планировщик, вне транзакции пополнения
    B->>DB: claim у outbox (lease, FOR UPDATE SKIP LOCKED)
    B->>R: publish DEPOSIT_CREATED (publisher confirm)
    B->>DB: mark SENT / retry с backoff / FAILED

    R->>D: bank.deposit.save.queue
    D->>D: идемпотентность по message_id (unique)
    R->>N: bank.notification.deposit.queue
    N->>N: claim доставки (INSERT … ON CONFLICT DO NOTHING) + reclaim
    N->>N: отправка письма, статус SENT/FAILED
```

## Что происходит при отказе на каждом шаге

| Отказ | Последствия | Как восстанавливается |
|---|---|---|
| Клиент повторил запрос | Второго зачисления нет | `Idempotency-Key`, повтор возвращает сохранённый ответ |
| Падение после `COMMIT`, до ответа клиенту | Баланс изменён, клиент не знает | Повтор с тем же ключом получает тот же ответ |
| Падение внутри транзакции | Ничего не изменено, ключ остался `IN_PROGRESS` | Попытка снимает claim; через 10 минут ключ считается брошенным и переиспользуется |
| RabbitMQ недоступен | Баланс изменён, события ждут в `PENDING` | Relay повторяет с экспоненциальным backoff, лимит 5 минут |
| Relay упал во время публикации | Сообщение может быть доставлено дважды | Lease истекает, сообщение переобрабатывается, consumer идемпотентен |
| Некорректный payload события | Строка переходит в `FAILED` | Не ретраится; логируется ошибка, строка остаётся как доказательство (нужен ручной разбор) |
| deposit-service недоступен | История отстаёт | Очередь durable, сообщение дождётся consumer'а |
| SMTP недоступен | Письмо не отправлено | `FAILED` → reclaim по таймауту, повторная попытка; возможен повтор письма |
| Ответ 5xx от API | Транзакция откатывается | Клиент повторяет с тем же ключом и получает корректный результат |

## Что этот сценарий сознательно не делает

- Нет компенсирующих транзакций: история и письмо — идемпотентные дописывания,
  компенсировать нечего.
- Нет распределённой транзакции: деньги меняются только в одной базе.
- Нет гарантии «ровно один раз» для email: при падении между отправкой и
  записью статуса письмо может уйти повторно. Для банковского уведомления это
  приемлемо и выбрано осознанно (см. ADR 0001).
