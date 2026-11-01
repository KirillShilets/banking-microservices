import { appConfig } from '../config'
import { bootstrapAuth } from '../auth/bootstrap'

export async function startApplication(): Promise<
  Awaited<ReturnType<typeof bootstrapAuth>>
> {
  // Loaded lazily so MSW and its handlers never reach the production runtime
  // when mock mode is disabled.
  if (appConfig.mockApi) {
    const { enableMocking } = await import('../mocks/browser')
    await enableMocking()
  }

  return bootstrapAuth()
}
