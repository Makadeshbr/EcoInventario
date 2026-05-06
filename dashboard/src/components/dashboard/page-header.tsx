import type { ReactNode } from 'react';

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <section className="panel overflow-hidden p-6 sm:p-8">
      <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="text-xs font-bold uppercase text-secondary">{eyebrow}</p>
          <h1 className="mt-3 text-[34px] font-semibold leading-[42px] text-primary sm:text-[40px] sm:leading-[48px]">
            {title}
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-on-surface-variant">{description}</p>
        </div>
        {action}
      </div>
    </section>
  );
}
