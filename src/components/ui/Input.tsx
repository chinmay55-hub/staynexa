import React from 'react';
import clsx from 'clsx';
import { AlertCircle } from 'lucide-react';

interface BaseFieldProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  containerClassName?: string;
}

export interface InputProps
  extends BaseFieldProps,
    Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className'> {
  icon?: any;
  iconLeft?: any;
  iconRight?: any;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      required,
      icon,
      iconLeft,
      iconRight: IconRight,
      className,
      containerClassName,
      id,
      ...props
    },
    ref,
  ) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    const leftIcon = iconLeft || icon;

    return (
      <div className={clsx('flex flex-col gap-1.5', containerClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-semibold uppercase tracking-wider text-stone-700 leading-none"
          >
            {label}
            {required && <span className="ml-0.5 text-rose-500">*</span>}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              {typeof leftIcon === 'function' ? (
                React.createElement(leftIcon, { size: 16, className: 'text-stone-400' })
              ) : (
                leftIcon
              )}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            required={required}
            className={clsx(
              'h-10 w-full rounded-lg border bg-white px-3 text-sm text-stone-900',
              'placeholder:text-stone-400 transition-colors duration-150',
              'focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/40 focus:border-[#c9a84c]',
              'disabled:cursor-not-allowed disabled:bg-stone-50 disabled:opacity-60',
              error
                ? 'border-rose-400 focus:ring-rose-300/40 focus:border-rose-400'
                : 'border-stone-200 hover:border-stone-300',
              leftIcon && 'pl-9',
              IconRight && 'pr-9',
              className,
            )}
            {...props}
          />

          {IconRight && !error && (
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              {typeof IconRight === 'function' ? (
                React.createElement(IconRight, { size: 16, className: 'text-stone-400' })
              ) : (
                IconRight
              )}
            </span>
          )}

          {error && (
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <AlertCircle size={16} className="text-rose-500" />
            </span>
          )}
        </div>

        {error ? (
          <p className="flex items-center gap-1 text-xs text-rose-600">{error}</p>
        ) : hint ? (
          <p className="text-xs text-stone-500">{hint}</p>
        ) : null}
      </div>
    );
  },
);

Input.displayName = 'Input';

export interface TextareaProps
  extends BaseFieldProps,
    Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> {
  rows?: number;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    { label, error, hint, required, className, containerClassName, id, rows = 3, ...props },
    ref,
  ) => {
    const textareaId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className={clsx('flex flex-col gap-1.5', containerClassName)}>
        {label && (
          <label
            htmlFor={textareaId}
            className="text-xs font-semibold uppercase tracking-wider text-stone-700 leading-none"
          >
            {label}
            {required && <span className="ml-0.5 text-rose-500">*</span>}
          </label>
        )}

        <div className="relative">
          <textarea
            ref={ref}
            id={textareaId}
            rows={rows}
            required={required}
            className={clsx(
              'w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-stone-900',
              'placeholder:text-stone-400 transition-colors duration-150 resize-y',
              'focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/40 focus:border-[#c9a84c]',
              'disabled:cursor-not-allowed disabled:bg-stone-50 disabled:opacity-60',
              error
                ? 'border-rose-400 focus:ring-rose-300/40 focus:border-rose-400'
                : 'border-stone-200 hover:border-stone-300',
              className,
            )}
            {...props}
          />
        </div>

        {error ? (
          <p className="text-xs text-rose-600">{error}</p>
        ) : hint ? (
          <p className="text-xs text-stone-500">{hint}</p>
        ) : null}
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps
  extends BaseFieldProps,
    Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'className'> {
  options: SelectOption[];
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      hint,
      required,
      options,
      placeholder,
      className,
      containerClassName,
      id,
      ...props
    },
    ref,
  ) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className={clsx('flex flex-col gap-1.5', containerClassName)}>
        {label && (
          <label
            htmlFor={selectId}
            className="text-xs font-semibold uppercase tracking-wider text-stone-700 leading-none"
          >
            {label}
            {required && <span className="ml-0.5 text-rose-500">*</span>}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            required={required}
            className={clsx(
              'h-10 w-full appearance-none rounded-lg border bg-white pl-3 pr-9 text-sm text-stone-900',
              'transition-colors duration-150 cursor-pointer',
              'focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/40 focus:border-[#c9a84c]',
              'disabled:cursor-not-allowed disabled:bg-stone-50 disabled:opacity-60',
              error
                ? 'border-rose-400 focus:ring-rose-300/40 focus:border-rose-400'
                : 'border-stone-200 hover:border-stone-300',
              className,
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>

          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <svg
              className="h-4 w-4 text-stone-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        </div>

        {error ? (
          <p className="text-xs text-rose-600">{error}</p>
        ) : hint ? (
          <p className="text-xs text-stone-500">{hint}</p>
        ) : null}
      </div>
    );
  },
);

Select.displayName = 'Select';

export default Input;
