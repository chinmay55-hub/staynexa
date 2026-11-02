import React from 'react';
import clsx from 'clsx';
import { TrendingUp, TrendingDown } from 'lucide-react';

// ─── Card ──────────────────────────────────────────────────────────────────────

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  noPadding?: boolean;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  noPadding = false,
  hoverable = false,
  className,
  children,
  ...props
}) => (
  <div
    className={clsx(
      'rounded-xl border border-stone-200/80 bg-white shadow-xs',
      !noPadding && 'p-5',
      hoverable &&
        'cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5',
      className,
    )}
    {...props}
  >
    {children}
  </div>
);

// ─── CardHeader ────────────────────────────────────────────────────────────────

export interface CardHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  icon?: any;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  subtitle,
  description,
  action,
  icon: Icon,
  className,
  children,
  ...props
}) => {
  const sub = description ?? subtitle;

  return (
    <div
      className={clsx(
        'flex items-start justify-between gap-3 pb-3 border-b border-stone-100',
        className,
      )}
      {...props}
    >
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          typeof Icon === 'function' ? (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#c9a84c]/10">
              <Icon size={18} className="text-[#c9a84c]" />
            </span>
          ) : (
            <span>{Icon}</span>
          )
        )}
        <div className="min-w-0">
          {title && (
            <h3 className="truncate text-base font-semibold text-stone-900 leading-tight">
              {title}
            </h3>
          )}
          {sub && (
            <p className="mt-0.5 truncate text-xs text-stone-500">{sub}</p>
          )}
          {children}
        </div>
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};

// ─── CardContent ───────────────────────────────────────────────────────────────

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  padTop?: boolean;
}

export const CardContent: React.FC<CardContentProps> = ({
  padTop = true,
  className,
  children,
  ...props
}) => (
  <div className={clsx(padTop && 'pt-3', className)} {...props}>
    {children}
  </div>
);

// ─── CardFooter ────────────────────────────────────────────────────────────────

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  bordered?: boolean;
}

export const CardFooter: React.FC<CardFooterProps> = ({
  bordered = true,
  className,
  children,
  ...props
}) => (
  <div
    className={clsx(
      'flex items-center justify-end gap-2 pt-3 mt-3',
      bordered && 'border-t border-stone-100',
      className,
    )}
    {...props}
  >
    {children}
  </div>
);

// ─── StatCard ──────────────────────────────────────────────────────────────────

export type ChangeDirection = 'up' | 'down' | 'neutral';

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  change?: string | number;
  changeDirection?: ChangeDirection;
  changeLabel?: string;
  icon?: any;
  iconColor?: string;
  iconBg?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  change,
  changeDirection = 'neutral',
  changeLabel,
  icon: Icon,
  iconColor = 'text-[#c9a84c]',
  iconBg = 'bg-[#c9a84c]/10',
  className,
  ...props
}) => {
  const isPositive = typeof change === 'number' ? change >= 0 : String(change || '').startsWith('+');
  const dir = change ? (isPositive ? 'up' : 'down') : changeDirection;

  return (
    <div
      className={clsx(
        'rounded-xl border border-stone-200/80 bg-white p-4 shadow-xs',
        className,
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
            {label}
          </p>
          <p className="mt-1.5 text-2xl font-bold font-display text-stone-900 leading-none">{value}</p>
        </div>

        {Icon && (
          typeof Icon === 'function' ? (
            <span className={clsx('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', iconBg)}>
              <Icon size={20} className={iconColor} />
            </span>
          ) : (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-stone-50">
              {Icon}
            </span>
          )
        )}
      </div>

      {(change !== undefined || changeLabel) && (
        <div className="mt-3 flex items-center gap-1.5 text-xs">
          {change !== undefined && (
            <span
              className={clsx(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold',
                dir === 'up' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700',
              )}
            >
              {dir === 'up' ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {typeof change === 'number' ? `${change > 0 ? '+' : ''}${change}%` : change}
            </span>
          )}
          {changeLabel && <span className="text-[11px] text-stone-400">{changeLabel}</span>}
        </div>
      )}
    </div>
  );
};

export default Card;
