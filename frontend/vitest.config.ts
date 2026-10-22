import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        setupFiles: './src/test/setup.ts',
        coverage: {
            provider: 'v8',
            // Scope the gate to the unit-tested runtime-config modules. The rest
            // of the SPA (components, auth flows) has no unit tests today; a
            // global threshold would force it down to ~0. Add modules here as
            // they gain tests. Global app coverage is tracked separately (HTML).
            include: ['src/config.ts', 'src/api/core/api-config.ts', 'src/auth/keycloak.ts'],
            thresholds: {
                lines: 50,
                branches: 50,
                functions: 33,
                statements: 50,
            },
        },
    },
})
