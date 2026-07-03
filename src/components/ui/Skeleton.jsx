import { cn } from '../../lib/utils'

export function Skeleton({ className = '' }) {
  return <div className={cn('animate-pulse bg-bg-elevated rounded-lg', className)} />
}

function CardSkeleton() {
  return (
    <div className="bg-bg-surface border border-border rounded-xl p-3.5 space-y-2.5">
      <Skeleton className="h-3.5 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-1.5 w-full" />
      <div className="flex justify-between">
        <Skeleton className="h-4 w-16 rounded-full" />
        <Skeleton className="h-4 w-10" />
      </div>
    </div>
  )
}

export function BoardSkeleton() {
  return (
    <div className="flex gap-4 px-6 pt-5 pb-6 overflow-hidden flex-1">
      {Array.from({ length: 4 }).map((_, col) => (
        <div key={col} className="flex-1 min-w-[220px] space-y-3">
          <Skeleton className="h-4 w-24" />
          {Array.from({ length: 3 - (col % 2) }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ))}
    </div>
  )
}

export function ListSkeleton() {
  return (
    <div className="px-6 pt-5 pb-6 space-y-2 flex-1">
      <Skeleton className="h-8 w-full" />
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-11 w-full" />
      ))}
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="px-4 sm:px-6 py-4 sm:py-6 max-w-5xl space-y-4 sm:space-y-6 flex-1">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-52 rounded-2xl" />
        <Skeleton className="h-52 rounded-2xl" />
      </div>
      <Skeleton className="h-20 rounded-2xl" />
    </div>
  )
}
