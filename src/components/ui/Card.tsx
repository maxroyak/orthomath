import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  className?: string;
  title?: string;
  action?: ReactNode;
}

export function Card({ children, className = '', title, action }: Props) {
  return (
    <div className={`bg-white border border-slate-200 rounded-xl ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          {title && <h3 className="font-semibold text-slate-900">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
