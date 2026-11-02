export class AuthenticationRequiredError extends Error {
  constructor(message = 'Сессия недоступна. Войдите снова.') {
    super(message)
    this.name = 'AuthenticationRequiredError'
  }
}
