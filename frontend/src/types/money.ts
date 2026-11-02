/**
 * The backend serialises BigDecimal values as JSON numbers. Keeping the union
 * allows the client to accept a string representation too (and avoids silently
 * narrowing money to an imprecise float in the domain layer).
 */
export type DecimalValue = number | string

export type CurrencyCode = 'RUB'
