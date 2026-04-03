import { clsx } from 'clsx'

export function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={clsx('skeleton-bar', className)} {...props} />
}

export function CourseCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-sm">
      <div className="aspect-[16/10] w-full skeleton-bar rounded-none" />
      <div className="space-y-3 p-6 sm:p-7">
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/5" />
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-7 w-20 rounded-full" />
          <Skeleton className="h-7 w-24 rounded-full" />
        </div>
        <div className="flex justify-between border-t border-slate-100 pt-5">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-10 w-28 rounded-xl" />
        </div>
      </div>
    </div>
  )
}

export function CourseDetailSkeleton() {
  return (
    <div>
      <Skeleton className="mb-8 h-4 w-48" />
      <div className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Skeleton className="aspect-[16/10] w-full rounded-3xl" />
        </div>
        <div className="space-y-4 lg:col-span-5">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-44 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  )
}

export function TableSkeletonRows({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-0">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 border-b border-slate-100 px-4 py-4">
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  )
}

/** My learning row placeholder */
export function MyCourseRowSkeleton() {
  return (
    <div className="card-elevated flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
      <div className="flex gap-5">
        <Skeleton className="h-24 w-36 shrink-0 rounded-2xl" />
        <div className="flex-1 space-y-3 py-1">
          <Skeleton className="h-5 w-3/5 max-w-md" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <Skeleton className="h-11 w-full rounded-xl sm:w-32" />
    </div>
  )
}

export function PageHeaderSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-12 w-full max-w-lg" />
      <Skeleton className="h-4 w-full max-w-xl" />
    </div>
  )
}

export function CertificateRowSkeleton() {
  return (
    <div className="card-elevated space-y-4 p-6 sm:p-8">
      <Skeleton className="h-3 w-40" />
      <Skeleton className="h-6 w-4/5 max-w-md" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-10 w-40 rounded-xl" />
    </div>
  )
}
