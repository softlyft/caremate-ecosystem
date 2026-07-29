import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/form-controls';

import { captureException } from '@/lib/monitoring/sentry';
import { palette } from '@/theme/colors';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * App-wide safety net for unhandled render errors. Kept intentionally free of
 * app providers (i18n, gluestack, react-query) and rendered with plain RN
 * primitives so the fallback still works even when those providers are the
 * thing that crashed.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (__DEV__) {
      console.error('Unhandled render error caught by ErrorBoundary', error, info.componentStack);
    }
    captureException(error, {
      componentStack: info.componentStack ?? undefined,
      source: 'ErrorBoundary',
    });
  }

  private handleRestart = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;

    if (!error) {
      return this.props.children;
    }

    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.body}>
            CareMate hit an unexpected problem. Your data is safe — try restarting the screen.
          </Text>
          {__DEV__ ? <Text style={styles.detail}>{error.message}</Text> : null}
          <Button
            accessibilityRole="button"
            onPress={this.handleRestart}
            style={styles.button}
            variant="plain"
          >
            <Text style={styles.buttonLabel}>Restart</Text>
          </Button>
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: palette.text,
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: palette.textSecondary,
    textAlign: 'center',
  },
  detail: {
    fontSize: 13,
    color: palette.danger,
    textAlign: 'center',
  },
  button: {
    marginTop: 8,
    minHeight: 44,
    paddingHorizontal: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primary,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
