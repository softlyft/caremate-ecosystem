import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-white shadow-sm hover:bg-primary-dark active:scale-[0.98]',
        secondary:
          'bg-surface text-foreground border border-border hover:bg-surface-muted active:scale-[0.98]',
        outline: 'border border-border bg-surface hover:bg-surface-muted active:scale-[0.98]',
        ghost: 'hover:bg-surface-muted',
        danger: 'bg-danger text-white shadow-sm hover:bg-red-600 active:scale-[0.98]',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  loadingLabel?: string;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      disabled,
      loading = false,
      loadingLabel,
      variant,
      size,
      ...props
    },
    ref,
  ) => (
    <button
      aria-busy={loading || undefined}
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || loading}
      ref={ref}
      {...props}
    >
      {loading ? (
        <svg
          aria-hidden="true"
          className="size-4 shrink-0 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle className="opacity-25" cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" />
          <path
            className="opacity-90"
            d="M21 12a9 9 0 0 0-9-9"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      ) : null}
      {loading && loadingLabel ? loadingLabel : children}
    </button>
  ),
);
Button.displayName = 'Button';
