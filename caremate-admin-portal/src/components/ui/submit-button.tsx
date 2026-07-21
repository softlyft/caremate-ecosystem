'use client';

import { useFormStatus } from 'react-dom';
import { Button, type ButtonProps } from '@/components/ui/button';

export function SubmitButton({
  children,
  loadingLabel,
  disabled,
  ...props
}: ButtonProps & { loadingLabel?: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" {...props} disabled={disabled} loading={pending} loadingLabel={loadingLabel}>
      {children}
    </Button>
  );
}
