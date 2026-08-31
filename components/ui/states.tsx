import {AlertCircle, SearchX} from "lucide-react";
import type {ReactNode} from "react";

export function EmptyState({title, text, action}: {title: string; text?: string; action?: ReactNode}) {
  return (
    <div className="grid place-items-center rounded-3xl border border-dashed border-border bg-surface px-6 py-14 text-center">
      <SearchX aria-hidden className="text-muted" size={28} />
      <p className="mt-4 text-lg font-extrabold">{title}</p>
      {text ? <p className="mt-2 max-w-md text-sm leading-6 text-muted">{text}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function ErrorState({title, text, action}: {title: string; text?: string; action?: ReactNode}) {
  return (
    <div role="alert" className="grid place-items-center rounded-3xl border border-danger-soft bg-danger-soft px-6 py-12 text-center">
      <AlertCircle aria-hidden className="text-danger" size={28} />
      <p className="mt-4 text-lg font-extrabold">{title}</p>
      {text ? <p className="mt-2 max-w-md text-sm leading-6 text-muted">{text}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function Skeleton({className = ""}: {className?: string}) {
  return <div aria-hidden className={`animate-pulse rounded-2xl bg-soft ${className}`} />;
}

export function CardListSkeleton({count = 6, label}: {count?: number; label: string}) {
  return (
    <div aria-busy="true" aria-label={label} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="status">
      {Array.from({length: count}, (_, index) => (
        <Skeleton className="h-44" key={index} />
      ))}
    </div>
  );
}
