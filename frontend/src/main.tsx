import '@fontsource-variable/manrope'
import '@fontsource-variable/jetbrains-mono'
import './index.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AppProviders } from './app/providers'
import { startApplication } from './app/bootstrap'
import {
  AuthenticationErrorScreen,
  BootstrapScreen,
} from './auth/AuthScreens'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Application root element was not found')
}

const root = createRoot(rootElement)

function retryAuthentication(): void {
  window.location.reload()
}

async function bootstrap(): Promise<void> {
  root.render(
    <StrictMode>
      <BootstrapScreen />
    </StrictMode>,
  )

  try {
    const auth = await startApplication()

    root.render(
      <StrictMode>
        <AppProviders bootstrap={auth} />
      </StrictMode>,
    )
  } catch (error) {
    console.error('Application bootstrap failed', error)
    root.render(
      <StrictMode>
        <AuthenticationErrorScreen onRetry={retryAuthentication} />
      </StrictMode>,
    )
  }
}

void bootstrap()
