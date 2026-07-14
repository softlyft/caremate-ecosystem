import { PropsWithChildren } from 'react';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/form-controls';
import { Card } from '@/components/ui/card';
import { Center } from '@/components/ui/center';
import { Spinner } from '@/components/ui/spinner';
import { Box } from '@/components/ui/box';

interface ScreenStateProps {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function LoadingState({ title }: { title?: string }) {
  return (
    <Center className="flex-1 p-6 gap-3">
      <Spinner size="large" className="text-primary" />
      {title ? (
        <AppText variant="quickActionSubtitle" style={{ textAlign: 'center' }}>
          {title}
        </AppText>
      ) : null}
    </Center>
  );
}

export function EmptyState({ title, message, actionLabel, onAction }: ScreenStateProps) {
  return (
    <Center className="flex-1 p-6 gap-3">
      <AppText variant="cardTitle" style={{ textAlign: 'center' }}>
        {title}
      </AppText>
      {message ? (
        <AppText variant="quickActionSubtitle" style={{ textAlign: 'center' }}>
          {message}
        </AppText>
      ) : null}
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} /> : null}
    </Center>
  );
}

export function ErrorState({ title, message, actionLabel, onAction }: ScreenStateProps) {
  return (
    <Center className="flex-1 p-6 gap-3">
      <AppText variant="cardTitle" color="brand" style={{ textAlign: 'center', color: '#EF4444' }}>
        {title}
      </AppText>
      {message ? (
        <AppText variant="quickActionSubtitle" style={{ textAlign: 'center' }}>
          {message}
        </AppText>
      ) : null}
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} /> : null}
    </Center>
  );
}

export function Screen({ children }: PropsWithChildren) {
  return <Box className="flex-1 bg-background p-4 gap-4">{children}</Box>;
}

export function StateCard({ children }: PropsWithChildren) {
  return <Card className="rounded-2xl border-border bg-card p-4 gap-2">{children}</Card>;
}

export { StateCard as Card };
