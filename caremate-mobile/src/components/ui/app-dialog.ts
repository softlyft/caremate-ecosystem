import { create } from 'zustand';

import type { ButtonVariant } from '@/components/ui/form-controls';

export type AppDialogActionVariant = Extract<
  ButtonVariant,
  'primary' | 'secondary' | 'destructive' | 'ghost'
>;

export type AppDialogAction = {
  label: string;
  variant?: AppDialogActionVariant;
  /** Value passed to the pending Promise when this action is chosen. */
  result?: unknown;
  onPress?: () => void;
};

export type AppDialogAlertButton = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
};

export type AppDialogConfirmOptions = {
  title: string;
  message: string;
  cancelLabel?: string;
  confirmLabel: string;
  confirmVariant?: 'primary' | 'destructive';
};

type PendingDialog = {
  id: string;
  title: string;
  message: string;
  actions: AppDialogAction[];
  resolve: (value: unknown) => void;
};

type AppDialogState = {
  current: PendingDialog | null;
  queue: PendingDialog[];
  enqueue: (dialog: Omit<PendingDialog, 'id'>) => void;
  complete: (result?: unknown) => void;
};

let dialogSeq = 0;

export const useAppDialogStore = create<AppDialogState>((set, get) => ({
  current: null,
  queue: [],
  enqueue: (dialog) => {
    const pending: PendingDialog = { ...dialog, id: `dialog-${++dialogSeq}` };
    const { current, queue } = get();
    if (!current) {
      set({ current: pending });
      return;
    }
    set({ queue: [...queue, pending] });
  },
  complete: (result) => {
    const { current, queue } = get();
    if (!current) {
      return;
    }
    current.resolve(result);
    const [next, ...rest] = queue;
    set({ current: next ?? null, queue: rest });
  },
}));

function mapAlertStyle(style: AppDialogAlertButton['style']): AppDialogActionVariant {
  if (style === 'destructive') {
    return 'destructive';
  }
  if (style === 'cancel') {
    return 'secondary';
  }
  return 'primary';
}

/**
 * Branded drop-in for `Alert.alert`. Resolves after the user dismisses the dialog.
 * Default action is a single primary OK when `buttons` is omitted.
 */
export function alert(
  title: string,
  message?: string,
  buttons?: AppDialogAlertButton[],
): Promise<void> {
  const actions: AppDialogAction[] =
    buttons && buttons.length > 0
      ? buttons.map((button) => ({
          label: button.text,
          variant: mapAlertStyle(button.style),
          onPress: button.onPress,
        }))
      : [{ label: 'OK', variant: 'primary' }];

  return new Promise((resolve) => {
    useAppDialogStore.getState().enqueue({
      title,
      message: message ?? '',
      actions,
      resolve: () => resolve(),
    });
  });
}

/** Two-button confirm; resolves `true` if confirm is pressed, otherwise `false`. */
export function confirm(options: AppDialogConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    useAppDialogStore.getState().enqueue({
      title: options.title,
      message: options.message,
      actions: [
        {
          label: options.cancelLabel ?? 'Cancel',
          variant: 'secondary',
          result: false,
        },
        {
          label: options.confirmLabel,
          variant: options.confirmVariant ?? 'primary',
          result: true,
        },
      ],
      resolve: (value) => resolve(Boolean(value)),
    });
  });
}

/** Test helper — clears the dialog queue without resolving listeners. */
export function __resetAppDialogForTests(): void {
  dialogSeq = 0;
  useAppDialogStore.setState({ current: null, queue: [] });
}
