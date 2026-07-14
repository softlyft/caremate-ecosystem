'use client';
import React from 'react';
import { Switch as RNSwitch } from 'react-native';
import { createSwitch } from '@gluestack-ui/core/switch/creator';
import { tva, withStyleContext } from '@gluestack-ui/utils/nativewind-utils';
import type { VariantProps } from '@gluestack-ui/utils/nativewind-utils';

const UISwitch = createSwitch({
  Root: withStyleContext(RNSwitch),
});

const switchStyle = tva({
  base: 'data-[focus=true]:outline-0 data-[focus=true]:ring-2 data-[focus=true]:ring-indicator-primary web:cursor-pointer disabled:cursor-not-allowed data-[disabled=true]:opacity-40 data-[invalid=true]:border-destructive data-[invalid=true]:rounded-xl data-[invalid=true]:border-2',

  variants: {
    size: {
      sm: 'scale-[0.75]',
      md: '',
      lg: 'scale-[1.25]',
    },
  },
});

type ISwitchProps = Omit<React.ComponentProps<typeof UISwitch>, 'className'> &
  VariantProps<typeof switchStyle> & {
    className?: string;
  };

const Switch = React.forwardRef<React.ComponentRef<typeof UISwitch>, ISwitchProps>(function Switch(
  { className, size = 'md', ...props },
  ref,
) {
  // RN Switch / Uniwind types forbid className (`never`); NativeWind applies it at runtime.
  const nativeWindProps = {
    className: switchStyle({ size, class: className }),
  } as unknown as React.ComponentProps<typeof UISwitch>;

  return <UISwitch ref={ref} {...props} {...nativeWindProps} />;
});

Switch.displayName = 'Switch';
export { Switch };
