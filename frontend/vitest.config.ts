import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        // v8 instrumentation makes the multi-page smoke test ~3x slower than a plain run.
        testTimeout: 15_000,
        setupFiles: './src/test/setup.ts',
        coverage: {
            provider: 'v8',
            // Report the whole SPA so the Sonar gate sees real numbers; the
            // thresholds below are the current floor and should only go up.
            include: ['src/**/*.{ts,tsx}'],
            exclude: ['src/main.tsx', 'src/test/**', 'src/vite-env.d.ts', 'src/**/*.d.ts'],
            thresholds: {
                lines: 40,
                branches: 30,
                functions: 35,
                statements: 40,
            },
        },
    },
})
