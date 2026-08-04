import { TextInput } from 'react-native';

import { scrollFocusedInputAboveKeyboard } from '@/hooks/use-keyboard-aware-scroll';

describe('scrollFocusedInputAboveKeyboard', () => {
  const originalFocused = TextInput.State.currentlyFocusedInput;

  afterEach(() => {
    TextInput.State.currentlyFocusedInput = originalFocused;
  });

  it('no-ops when keyboard top is unknown', () => {
    const scrollTo = jest.fn();
    const scrollRef = { current: { scrollTo, scrollToEnd: jest.fn() } };
    scrollFocusedInputAboveKeyboard(scrollRef as never, 0, 0);
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('scrolls by overlap when the focused field sits under the keyboard', () => {
    const scrollTo = jest.fn();
    const scrollToEnd = jest.fn();
    const scrollRef = { current: { scrollTo, scrollToEnd } };

    const measureInWindow = jest.fn((cb: (x: number, y: number, w: number, h: number) => void) => {
      cb(0, 700, 320, 48);
    });

    TextInput.State.currentlyFocusedInput = jest.fn(() => ({ measureInWindow })) as never;

    scrollFocusedInputAboveKeyboard(scrollRef as never, 40, 720, 16);
    // overlap = 700 + 48 + 16 - 720 = 44 → scrollY 40 + 44 = 84
    expect(scrollTo).toHaveBeenCalledWith({ y: 84, animated: true });
    expect(scrollToEnd).not.toHaveBeenCalled();
  });

  it('falls back to scrollToEnd when nothing is focused', () => {
    const scrollTo = jest.fn();
    const scrollToEnd = jest.fn();
    const scrollRef = { current: { scrollTo, scrollToEnd } };

    TextInput.State.currentlyFocusedInput = jest.fn(() => null) as never;

    scrollFocusedInputAboveKeyboard(scrollRef as never, 0, 500);
    expect(scrollToEnd).toHaveBeenCalledWith({ animated: true });
    expect(scrollTo).not.toHaveBeenCalled();
  });
});
