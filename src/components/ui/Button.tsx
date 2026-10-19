import React from 'react';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  iconLeft?: any;
  iconRight?: any;
  fullWidth?: boolean;
  children?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-[#c9a84c] text-white hover:bg-[#b8933d] active:bg-[#a87e2e] shadow-sm focus-visible:ring-[#c9a84c]/50',
  secondary:
    'bg-[#1a2744] text-white hover:bg-[#243561] active:bg-[#141f36] shadow-sm focus-visible:ring-[#1a2744]/40',
  outline:
    'bg-transparent border border-stone-300 text-stone-800 hover:bg-stone-50 active:bg-stone-100 focus-visible:ring-stone-300',
  ghost:
    'bg-transparent text-stone-700 hover:bg-stone-100 active:bg-stone-200 focus-visible:ring-stone-300',
  danger:
    'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 shadow-sm focus-visible:ring-rose-500/50',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-12 px-6 text-base gap-2.5 rounded-xl',
};

const iconSizes: Record<ButtonSize, number> = {
  sm: 14,
  md: 16,
  lg: 18,
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled = false,
      iconLeft: IconLeft,
      iconRight: IconRight,
      fullWidth = false,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;
    const iconSize = iconSizes[size];

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={clsx(
          'inline-flex items-center justify-center font-medium transition-all duration-150',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'select-none whitespace-nowrap cursor-pointer',
          variantStyles[variant],
          sizeStyles[size],
          isDisabled && 'cursor-not-allowed opacity-50',
          fullWidth && 'w-full',
          className,
        )}
        {...props}
      >
        {loading ? (
          <Loader2 size={iconSize} className="animate-spin shrink-0" />
        ) : (
          IconLeft && (
            typeof IconLeft === 'function' ? (
              <IconLeft size={iconSize} className="shrink-0" />
            ) : (
              <span className="shrink-0">{IconLeft}</span>
            )
          )
        )}
        {children && <span>{children}</span>}
        {!loading && IconRight && (
          typeof IconRight === 'function' ? (
            <IconRight size={iconSize} className="shrink-0" />
          ) : (
            <span className="shrink-0">{IconRight}</span>
          )
        )}
      </button>
    );
  },
);

Button.displayName = 'Button';

export default Button;
