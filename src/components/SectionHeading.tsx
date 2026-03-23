import type { ReactNode } from 'react';

interface Props {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export default function SectionHeading({ title, subtitle, actions }: Props) {
  return (
    <div className="flex items-end justify-between mb-8">
      <div>
        <h2 className="text-3xl font-heading">{title}</h2>
        {subtitle && <p className="text-muted-foreground mt-1 text-sm">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}
