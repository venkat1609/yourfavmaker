import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  className?: string;
}

export default function SectionShell({ children, className = '' }: Props) {
  return (
    <section className={`py-16 animate-fade-in ${className}`}>
      <div className="container">{children}</div>
    </section>
  );
}
