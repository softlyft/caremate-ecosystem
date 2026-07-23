import React, { useEffect } from 'react';
import { View, ViewProps } from 'react-native';
import { OverlayProvider } from '@gluestack-ui/core/overlay/creator';
import { ToastProvider } from '@gluestack-ui/core/toast/creator';
import { Uniwind } from 'uniwind';

export type ModeType = 'light' | 'dark' | 'system';

/** CareMate UI is light-only; `mode` is accepted for API compatibility but always applies light. */
export function GluestackUIProvider({
  mode: _mode = 'light',
  ...props
}: {
  mode?: ModeType;
  children?: React.ReactNode;
  style?: ViewProps['style'];
}) {
  useEffect(() => {
    Uniwind.setTheme('light');
  }, []);

  return (
    <View style={[{ flex: 1, height: '100%', width: '100%' }, props.style]}>
      <OverlayProvider>
        <ToastProvider>{props.children}</ToastProvider>
      </OverlayProvider>
    </View>
  );
}
