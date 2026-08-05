import {
  __resetAppDialogForTests,
  alert,
  confirm,
  useAppDialogStore,
} from '@/components/ui/app-dialog';

describe('app-dialog', () => {
  beforeEach(() => {
    __resetAppDialogForTests();
  });

  it('shows a default OK alert and resolves on complete', async () => {
    const pending = alert('Title', 'Message');
    const current = useAppDialogStore.getState().current;
    expect(current?.title).toBe('Title');
    expect(current?.message).toBe('Message');
    expect(current?.actions).toHaveLength(1);
    expect(current?.actions[0]?.label).toBe('OK');

    useAppDialogStore.getState().complete();
    await expect(pending).resolves.toBeUndefined();
    expect(useAppDialogStore.getState().current).toBeNull();
  });

  it('queues a second dialog until the first completes', async () => {
    const first = alert('One');
    const second = alert('Two');

    expect(useAppDialogStore.getState().current?.title).toBe('One');
    expect(useAppDialogStore.getState().queue).toHaveLength(1);

    useAppDialogStore.getState().complete();
    await first;
    expect(useAppDialogStore.getState().current?.title).toBe('Two');

    useAppDialogStore.getState().complete();
    await second;
    expect(useAppDialogStore.getState().current).toBeNull();
    expect(useAppDialogStore.getState().queue).toHaveLength(0);
  });

  it('resolves confirm true/false from action results', async () => {
    const pending = confirm({
      title: 'Confirm',
      message: 'Are you sure?',
      cancelLabel: 'Cancel',
      confirmLabel: 'Save',
      confirmVariant: 'destructive',
    });

    const current = useAppDialogStore.getState().current;
    expect(current?.actions.map((action) => action.result)).toEqual([false, true]);
    expect(current?.actions[1]?.variant).toBe('destructive');

    useAppDialogStore.getState().complete(false);
    await expect(pending).resolves.toBe(false);

    const pendingYes = confirm({
      title: 'Confirm',
      message: 'Go?',
      confirmLabel: 'Yes',
    });
    useAppDialogStore.getState().complete(true);
    await expect(pendingYes).resolves.toBe(true);
  });

  it('invokes alert button onPress when the host completes after press', async () => {
    const onPress = jest.fn();
    const pending = alert('Title', 'Body', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Go', style: 'destructive', onPress },
    ]);

    const action = useAppDialogStore.getState().current?.actions[1];
    expect(action?.variant).toBe('destructive');
    action?.onPress?.();
    useAppDialogStore.getState().complete(action?.result);
    await pending;
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
