import { HStack, Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle, padding } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { EmergencyLockWidgetProps } from '@/widgets/emergency-lock-widget-types';

/**
 * Home/Lock emergency glance — teal hierarchy inspired by the Patient ID card.
 * Lock accessories stay minimal; home sizes use a branded card-like stack.
 */
const EmergencyLockWidgetLayout = (
  props: EmergencyLockWidgetProps,
  environment: WidgetEnvironment,
) => {
  'widget';

  const isDark = environment.colorScheme === 'dark';
  // Light: teal card ink; dark: high-contrast on system widget chrome.
  const brandColor = isDark ? '#5EEAD4' : '#0D9488';
  const titleColor = isDark ? '#F8FAFC' : '#115E59';
  const mutedColor = isDark ? '#94A3B8' : '#0F766E';
  const softMuted = isDark ? '#64748B' : '#5EEAD4';
  const accentColor = isDark ? '#2DD4BF' : '#0D9488';

  if (!props.hasProfile) {
    return (
      <VStack modifiers={[padding({ all: 12 })]}>
        <Text modifiers={[font({ weight: 'semibold', size: 10 }), foregroundStyle(brandColor)]}>
          CAREMATE
        </Text>
        <Text modifiers={[font({ weight: 'bold', size: 14 }), foregroundStyle(titleColor)]}>
          Emergency
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
        <Text modifiers={[font({ size: 9 }), foregroundStyle(mutedColor)]}>Blood</Text>
      </VStack>
    );
  }

  if (environment.widgetFamily === 'accessoryInline') {
    return (
      <Text modifiers={[font({ size: 13 }), foregroundStyle(titleColor)]}>
        {props.fullName} · {props.bloodGroup || 'Blood n/a'} · {props.contactPhone || 'No ICE'}
      </Text>
    );
  }

  const bloodLine = [
    props.bloodGroup || 'Blood n/a',
    props.genotype ? props.genotype : null,
  ]
    .filter(Boolean)
    .join(' · ');

  // Lock rectangular + home small: compact branded card panel.
  if (
    environment.widgetFamily === 'accessoryRectangular' ||
    environment.widgetFamily === 'systemSmall'
  ) {
    return (
      <VStack modifiers={[padding({ all: 10 })]}>
        <HStack>
          <Text modifiers={[font({ weight: 'semibold', size: 9 }), foregroundStyle(brandColor)]}>
            CAREMATE
          </Text>
          <Text modifiers={[font({ weight: 'semibold', size: 9 }), foregroundStyle(softMuted)]}>
            EMERGENCY
          </Text>
        </HStack>
        <Text modifiers={[font({ weight: 'bold', size: 14 }), foregroundStyle(titleColor)]}>
          {props.fullName}
        </Text>
        <Text modifiers={[font({ weight: 'semibold', size: 12 }), foregroundStyle(accentColor)]}>
          {bloodLine}
        </Text>
        {props.contactName ? (
          <Text modifiers={[font({ size: 11 }), foregroundStyle(mutedColor)]}>
            ICE {props.contactName}
            {props.contactPhone ? ` · ${props.contactPhone}` : ''}
          </Text>
        ) : (
          <Text modifiers={[font({ size: 11 }), foregroundStyle(mutedColor)]}>No ICE contact</Text>
        )}
      </VStack>
    );
  }

  // Home medium (and larger): full card-like hierarchy.
  return (
    <VStack modifiers={[padding({ all: 12 })]}>
      <HStack>
        <Text modifiers={[font({ weight: 'semibold', size: 10 }), foregroundStyle(brandColor)]}>
          CAREMATE
        </Text>
        <Text modifiers={[font({ weight: 'semibold', size: 10 }), foregroundStyle(softMuted)]}>
          EMERGENCY
        </Text>
      </HStack>
      <Text modifiers={[font({ weight: 'bold', size: 17 }), foregroundStyle(titleColor)]}>
        {props.fullName}
      </Text>
      <HStack>
        <Text modifiers={[font({ weight: 'bold', size: 13 }), foregroundStyle(accentColor)]}>
          Blood {props.bloodGroup || 'n/a'}
        </Text>
        {props.genotype ? (
          <Text modifiers={[font({ weight: 'semibold', size: 13 }), foregroundStyle(mutedColor)]}>
            Genotype {props.genotype}
          </Text>
        ) : null}
      </HStack>
      {props.allergies ? (
        <Text modifiers={[font({ size: 12 }), foregroundStyle(mutedColor)]}>
          Allergies · {props.allergies}
        </Text>
      ) : (
        <Text modifiers={[font({ size: 12 }), foregroundStyle(mutedColor)]}>
          Allergies · none listed
        </Text>
      )}
      {props.contactName ? (
        <VStack>
          <Text modifiers={[font({ weight: 'semibold', size: 12 }), foregroundStyle(titleColor)]}>
            ICE · {props.contactName}
            {props.contactRelationship ? ` (${props.contactRelationship})` : ''}
          </Text>
          <Text modifiers={[font({ weight: 'bold', size: 14 }), foregroundStyle(accentColor)]}>
            {props.contactPhone || 'No phone'}
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
