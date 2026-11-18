import { appConfig } from '../config'
import { bootstrapAuth } from '../auth/bootstrap'

export async function startApplication(): Promise<
  Awaited<ReturnType<typeof bootstrapAuth>>
> {
  // The DEV constant must be part of this guard: it is the only condition the
  // bundler can evaluate statically, so a production build drops the branch (and
  // with it the MSW chunk) instead of shipping the mock backend disabled.
  if (import.meta.env.DEV && appConfig.mockApi) {
    const { enableMocking } = await import('../mocks/browser')
    await enableMocking()
  }

  return bootstrapAuth()
}
