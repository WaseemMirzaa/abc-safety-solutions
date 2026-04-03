import { clsx } from 'clsx'

export function Container({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      className={clsx('mx-auto w-full min-w-0 max-w-7xl px-4 sm:px-6 lg:px-10', className)}
      {...props}
    />
  )
}
