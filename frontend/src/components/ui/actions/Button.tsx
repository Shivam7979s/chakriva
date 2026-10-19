import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-colors select-none focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:pointer-events-none rounded';

    const variantStyles: Record<ButtonVariant, string> = {
      primary:
        'bg-primary text-white hover:bg-primary-hover focus-visible:outline-primary active:brightness-95 shadow-sm',
      secondary:
        'bg-surface-elevated text-text-primary border border-border hover:bg-surface-subtle active:brightness-95',
      outline:
        'bg-transparent text-text-primary border border-border hover:bg-surface-subtle active:brightness-95',
      ghost:
        'bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface-subtle',
      danger:
        'bg-error text-white hover:bg-red-600 focus-visible:outline-error active:brightness-95',
    };

    const sizeStyles: Record<ButtonSize, string> = {
      sm: 'h-8 px-2.5 text-[12px] gap-1.5',
      md: 'h-9 px-3.5 text-[13px] gap-2',
      lg: 'h-11 px-5 text-[14px] gap-2.5',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-current" aria-hidden="true" />
        ) : (
          leftIcon && <span className="inline-flex shrink-0" aria-hidden="true">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && (
          <span className="inline-flex shrink-0" aria-hidden="true">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
