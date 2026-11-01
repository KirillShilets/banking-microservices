import { ApiError } from '../api/core'
import { AuthenticationRequiredError } from '../auth/errors'

/**
 * Backend errors arrive as `[HTTP 404] Account not found`. The raw status code
 * is useful in logs but noise for a customer, so the UI uses this mapper.
 */
export function toMessage(error: unknown): string {
  if (error instanceof AuthenticationRequiredError) {
    return 'Сессия истекла. Войдите в систему, чтобы продолжить.'
  }

  if (error instanceof ApiError) {
    switch (error.status) {
      case 400:
        return cleanBackendMessage(error.message) || 'Проверьте введённые данные.'
      case 401:
        return 'Не удалось подтвердить сессию. Войдите снова.'
      case 403:
        return 'Недостаточно прав для этой операции.'
      case 404:
        return 'Запись не найдена. Проверьте идентификатор и повторите попытку.'
      case 409:
        return 'Операция уже выполнена или профиль уже существует.'
      case 422:
        return cleanBackendMessage(error.message) || 'Данные не прошли проверку.'
      case 429:
        return 'Слишком много запросов. Подождите немного и повторите.'
      case 500:
      case 502:
      case 503:
      case 504:
        return 'Сервис временно недоступен. Попробуйте ещё раз через минуту.'
      default:
        break
    }

    if (!error.status) {
      return 'Нет связи с банком. Проверьте подключение к сети.'
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return 'Не удалось выполнить операцию. Попробуйте ещё раз.'
}

function cleanBackendMessage(message: string): string {
  return message.replace(/^\[HTTP \d{3}]\s*/, '').trim()
}

export function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404
}

export function isForbidden(error: unknown): boolean {
  return error instanceof ApiError && error.status === 403
}
