import i18n from '@/i18n/config'

type TArg = string | Record<string, unknown>

/** Use outside React components (and inside) after `import '@/i18n/config'` in main. */
export function t(key: string, defaultOrOptions?: TArg) {
  if (typeof defaultOrOptions === 'string' || defaultOrOptions === undefined) {
    return i18n.t(key, { defaultValue: defaultOrOptions ?? key })
  }
  return i18n.t(key, defaultOrOptions)
}
