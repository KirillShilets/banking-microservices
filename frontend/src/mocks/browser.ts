import { setupWorker } from 'msw/browser'
import { appConfig } from '../config'
import { handlers } from './handlers'

export const worker = setupWorker(...handlers)

/**
 * Starts the in-browser API only when explicitly enabled. The dynamic import
 * in `enableMocking` keeps MSW out of the production entry chunk.
 */
export async function enableMocking(): Promise<void> {
  if (!appConfig.mockApi) return

  await worker.start({
    onUnhandledFrame: 'bypass',
    serviceWorker: {
      url: '/mockServiceWorker.js',
    },
    quiet: true,
  })
}
