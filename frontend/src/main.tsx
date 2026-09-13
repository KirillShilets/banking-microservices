import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { initAuth } from './auth/auth-init'
import {
    AuthenticationErrorScreen,
    AuthenticationLoadingScreen,
} from './auth/AuthScreens'
import './index.css'

const rootElement = document.getElementById('root')

if (!rootElement) {
    throw new Error('Application root element was not found')
}

const root = createRoot(rootElement)

function retryAuthentication(): void {
    window.location.reload()
}

function renderAuthenticationError(): void {
    root.render(
        <StrictMode>
            <AuthenticationErrorScreen onRetry={retryAuthentication} />
        </StrictMode>,
    )
}

async function bootstrap(): Promise<void> {
    root.render(
        <StrictMode>
            <AuthenticationLoadingScreen />
        </StrictMode>,
    )

    try {
        const authenticated = await initAuth()

        if (!authenticated) {
            renderAuthenticationError()
            return
        }

        root.render(
            <StrictMode>
                <App />
            </StrictMode>,
        )
    } catch {
        console.error('Authentication initialization failed')
        renderAuthenticationError()
    }
}

void bootstrap()