import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(() => {
  cleanup()
})

if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  })
}

if (!('ResizeObserver' in window)) {
  class ResizeObserverShim implements ResizeObserver {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }

  Object.defineProperty(window, 'ResizeObserver', {
    writable: true,
    value: ResizeObserverShim,
  })
}

Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: vi.fn(),
})

/**
 * MSW 3.0.3 resets its handler controller with the ES2025 Set helpers
 * (`intersection`, `difference`). They ship in Node 22+, while the frontend CI
 * jobs run on Node 20, so both methods are provided when missing.
 */
type SetWithEs2025 = Set<unknown> & {
  intersection?: (other: Set<unknown>) => Set<unknown>
  difference?: (other: Set<unknown>) => Set<unknown>
}

const setPrototype = Set.prototype as SetWithEs2025

if (typeof setPrototype.intersection !== 'function') {
  Object.defineProperty(setPrototype, 'intersection', {
    writable: true,
    configurable: true,
    value(this: Set<unknown>, other: Set<unknown>) {
      const result = new Set<unknown>()
      for (const item of this) {
        if (other.has(item)) result.add(item)
      }
      return result
    },
  })
}

if (typeof setPrototype.difference !== 'function') {
  Object.defineProperty(setPrototype, 'difference', {
    writable: true,
    configurable: true,
    value(this: Set<unknown>, other: Set<unknown>) {
      const result = new Set<unknown>()
      for (const item of this) {
        if (!other.has(item)) result.add(item)
      }
      return result
    },
  })
}

/**
 * @mswjs/interceptors creates socket controllers with `Promise.withResolvers`,
 * another helper that only exists in Node 22+. Keep the test run independent of
 * the host Node version.
 */
type PromiseConstructorWithResolvers = PromiseConstructor & {
  withResolvers?: <T>() => {
    promise: Promise<T>
    resolve: (value: T | PromiseLike<T>) => void
    reject: (reason?: unknown) => void
  }
}

const promiseConstructor = Promise as PromiseConstructorWithResolvers

if (typeof promiseConstructor.withResolvers !== 'function') {
  Object.defineProperty(promiseConstructor, 'withResolvers', {
    writable: true,
    configurable: true,
    value<T>() {
      let resolve!: (value: T | PromiseLike<T>) => void
      let reject!: (reason?: unknown) => void
      const promise = new Promise<T>((res, rej) => {
        resolve = res
        reject = rej
      })
      return { promise, resolve, reject }
    },
  })
}
