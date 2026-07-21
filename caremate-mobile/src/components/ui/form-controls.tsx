import { useState } from 'react';
import { TextInputProps } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';

import { Button as GSButton, ButtonText } from '@/components/ui/button';
import { Input, InputField, InputSlot } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { palette } from '@/theme';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
}

export function Button({ label, onPress, variant = 'primary', disabled }: ButtonProps) {
  const gsVariant =
    variant === 'primary' ? 'default' : variant === 'secondary' ? 'outline' : 'ghost';

  return (
    <GSButton
      variant={gsVariant}
      disabled={disabled}
      onPress={onPress}
      className="rounded-full min-h-11 px-6"
    >
      <ButtonText className="font-semibold">{label}</ButtonText>
    </GSButton>
  );
}

export function InputControl(props: TextInputProps) {
  return (
    <Input className="rounded-xl min-h-12 bg-secondary border-border">
      <InputField className="text-[15px] font-sans" {...props} />
    </Input>
  );
}

export { InputControl as Input };

export function PasswordInput(props: TextInputProps) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;

  return (
    <Input className="rounded-xl min-h-12 bg-secondary border-border">
      <InputField
        autoCapitalize="none"
        autoCorrect={false}
        className="text-[15px] font-sans"
        secureTextEntry={!visible}
        textContentType="password"
        {...props}
      />
      <InputSlot
        accessibilityLabel={visible ? 'Hide password' : 'Show password'}
        accessibilityRole="button"
        hitSlop={8}
        onPress={() => setVisible((current) => !current)}
        className="h-11 w-11"
      >
        <Icon color={palette.textSecondary} size={20} strokeWidth={2.2} />
      </InputSlot>
    </Input>
  );
}

export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <VStack className="gap-1">
      <Text className="text-[28px] leading-[34px] font-bold text-foreground font-heading">
        {title}
      </Text>
      {subtitle ? (
        <Text className="text-[15px] leading-[22px] text-muted-foreground font-sans">
          {subtitle}
        </Text>
      ) : null}
    </VStack>
  );
}
