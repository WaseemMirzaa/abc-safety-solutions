import '@testing-library/jest-dom/vitest'
import '@/i18n/config'

class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null
  readonly rootMargin = ''
  readonly thresholds: ReadonlyArray<number> = []
  observe = (): void => {}
  unobserve = (): void => {}
  disconnect = (): void => {}
  takeRecords = (): IntersectionObserverEntry[] => []
}

globalThis.IntersectionObserver =
  MockIntersectionObserver as unknown as typeof IntersectionObserver

Object.defineProperty(window, 'scrollTo', {
  value: () => {},
  writable: true,
})
