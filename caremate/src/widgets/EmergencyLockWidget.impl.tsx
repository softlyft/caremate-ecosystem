import { HStack, Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle, padding } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { EmergencyLockWidgetProps } from '@/widgets/emergency-lock-widget-types';

const EmergencyLockWidgetLayout = (
  props: EmergencyLockWidgetProps,
  environment: WidgetEnvironment,
) => {
  'widget';

  const isDark = environment.colorScheme === 'dark';
  const titleColor = isDark ? '#F8FAFC' : '#111827';
  const mutedColor = isDark ? '#94A3B8' : '#6B7280';
  const accentColor = '#16A34A';

  if (!props.hasProfile) {
    return (
      <VStack modifiers={[padding({ all: 12 })]}>
        <Text modifiers={[font({ weight: 'bold', size: 14 }), foregroundStyle(titleColor)]}>
          CareMate Emergency
        </Text>
        <Text modifiers={[font({ size: 12 }), foregroundStyle(mutedColor)]}>
          Add your emergency profile in the app
        </Text>
      </VStack>
    );
  }

  if (environment.widgetFamily === 'accessoryCircular') {
    return (
      <VStack>
        <Text modifiers={[font({ weight: 'bold', size: 16 }), foregroundStyle(accentColor)]}>
          {props.bloodGroup || '—'}
        </Text>
        <Text modifiers={[font({ size: 10 }), foregroundStyle(mutedColor)]}>Blood</Text>
      </VStack>
    );
  }

  if (environment.widgetFamily === 'accessoryInline') {
    return (
      <Text modifiers={[font({ size: 13 }), foregroundStyle(titleColor)]}>
        {props.fullName} · {props.bloodGroup || 'Blood n/a'} · {props.contactPhone || 'No contact'}
      </Text>
    );
  }

  if (
    environment.widgetFamily === 'accessoryRectangular' ||
    environment.widgetFamily === 'systemSmall'
  ) {
    return (
      <VStack modifiers={[padding({ all: 10 })]}>
        <Text modifiers={[font({ weight: 'bold', size: 13 }), foregroundStyle(titleColor)]}>
          {props.fullName}
        </Text>
        <Text modifiers={[font({ size: 12 }), foregroundStyle(accentColor)]}>
          {props.bloodGroup || 'Blood n/a'}
          {props.genotype ? ` · ${props.genotype}` : ''}
        </Text>
        {props.contactName ? (
          <Text modifiers={[font({ size: 11 }), foregroundStyle(mutedColor)]}>
            ICE: {props.contactName} {props.contactPhone}
          </Text>
        ) : (
          <Text modifiers={[font({ size: 11 }), foregroundStyle(mutedColor)]}>No ICE contact</Text>
        )}
      </VStack>
    );
  }

  return (
    <VStack modifiers={[padding({ all: 12 })]}>
      <Text modifiers={[font({ weight: 'bold', size: 15 }), foregroundStyle(titleColor)]}>
        Emergency · {props.fullName}
      </Text>
      <HStack>
        <Text modifiers={[font({ size: 13 }), foregroundStyle(accentColor)]}>
          Blood {props.bloodGroup || 'n/a'}
        </Text>
        <Text modifiers={[font({ size: 13 }), foregroundStyle(mutedColor)]}>
          {props.genotype ? `Genotype ${props.genotype}` : ''}
        </Text>
      </HStack>
      {props.allergies ? (
        <Text modifiers={[font({ size: 12 }), foregroundStyle(mutedColor)]}>
          Allergies: {props.allergies}
        </Text>
      ) : null}
      {props.contactName ? (
        <VStack>
          <Text modifiers={[font({ weight: 'semibold', size: 12 }), foregroundStyle(titleColor)]}>
            ICE · {props.contactName}
            {props.contactRelationship ? ` (${props.contactRelationship})` : ''}
          </Text>
          <Text modifiers={[font({ size: 13 }), foregroundStyle(accentColor)]}>
            {props.contactPhone}
          </Text>
        </VStack>
      ) : (
        <Text modifiers={[font({ size: 12 }), foregroundStyle(mutedColor)]}>
          No emergency contact saved
        </Text>
      )}
    </VStack>
  );
};

export default createWidget('EmergencyLockWidget', EmergencyLockWidgetLayout);
