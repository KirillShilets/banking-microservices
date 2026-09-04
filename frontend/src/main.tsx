import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initAuth } from './auth/auth-init'

async function bootstrap() {
    const authenticated = await initAuth()

    if (!authenticated) {
        window.location.reload()
        return
    }

    createRoot(document.getElementById('root')!).render(
        <StrictMode>
            <App />
        </StrictMode>,
    )
}

bootstrap()