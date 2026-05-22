/** Shared admin form field styling when validation fails. */
export function fieldClass(hasError: boolean, base = 'input-pro mt-1.5 w-full'): string {
  return hasError ? `${base} border-red-400 ring-2 ring-red-200/60` : base
}
