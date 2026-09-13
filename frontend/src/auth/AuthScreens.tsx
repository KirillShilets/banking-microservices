interface AuthenticationErrorScreenProps {
    onRetry: () => void
}

export function AuthenticationLoadingScreen() {
    return (
        <main aria-busy="true">
            <h1>Banking System</h1>
            <p role="status">Подключение к сервису авторизации…</p>
        </main>
    )
}

export function AuthenticationErrorScreen({
                                              onRetry,
                                          }: AuthenticationErrorScreenProps) {
    return (
        <main>
            <h1>Не удалось выполнить вход</h1>

            <p role="alert">
                Сервис авторизации недоступен или вход не был завершён.
                Попробуйте ещё раз.
            </p>

            <button type="button" onClick={onRetry}>
                Повторить вход
            </button>
        </main>
    )
}