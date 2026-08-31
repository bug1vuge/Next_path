import type {ReactNode} from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="container-page pt-10 pb-6 sm:pt-14">
      {eyebrow ? <p className="text-sm font-bold text-brand">{eyebrow}</p> : null}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
          {description ? <p className="mt-3 max-w-2xl text-base leading-7 text-muted">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

export function Section({
  title,
  children,
  action
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">{title}</h2>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export type Definition = {term: string; value: ReactNode};

/** Drops entries the source did not provide, so absent values render nothing. */
export function definitions(items: (Definition | null | false | undefined)[]): Definition[] {
  return items.filter((item): item is Definition => Boolean(item));
}

export function DefinitionList({items}: {items: Definition[]}) {
  if (items.length === 0) return null;
  return (
    <dl className="grid gap-3">
      {items.map((item) => (
        <div className="grid gap-1 border-b border-border pb-3 last:border-0 last:pb-0 sm:grid-cols-[12rem_1fr] sm:gap-4" key={item.term}>
          <dt className="text-sm font-bold text-muted">{item.term}</dt>
          <dd className="text-sm leading-6 whitespace-pre-line">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
