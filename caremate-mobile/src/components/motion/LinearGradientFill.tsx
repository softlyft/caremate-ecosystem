import { ReactNode, useId, useState } from 'react';
import { LayoutChangeEvent, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

type GradientStop = {
  offset: string;
  color: string;
  opacity?: number;
};

type LinearGradientFillProps = {
  colors: GradientStop[];
  angle?: number;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

function angleToCoords(angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x1: `${50 - Math.cos(rad) * 50}%`,
    y1: `${50 - Math.sin(rad) * 50}%`,
    x2: `${50 + Math.cos(rad) * 50}%`,
    y2: `${50 + Math.sin(rad) * 50}%`,
  };
}

export function LinearGradientFill({
  colors,
  angle = 135,
  style,
  children,
}: LinearGradientFillProps) {
  const reactId = useId().replace(/:/g, '');
  const gradientId = `grad-${reactId}`;
  const coords = angleToCoords(angle);
  const [size, setSize] = useState({ width: 0, height: 0 });

  function handleLayout(event: LayoutChangeEvent) {
    const { width, height } = event.nativeEvent.layout;
    if (width !== size.width || height !== size.height) {
      setSize({ width, height });
    }
  }

  return (
    <View style={[{ overflow: 'hidden' }, style]} onLayout={handleLayout}>
      {size.width > 0 && size.height > 0 ? (
        <Svg
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
          width={size.width}
          height={size.height}
        >
          <Defs>
            <LinearGradient
              id={gradientId}
              x1={coords.x1}
              y1={coords.y1}
              x2={coords.x2}
              y2={coords.y2}
            >
              {colors.map((stop, index) => (
                <Stop
                  key={`${stop.color}-${index}`}
                  offset={stop.offset}
                  stopColor={stop.color}
                  stopOpacity={stop.opacity ?? 1}
                />
              ))}
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width={size.width} height={size.height} fill={`url(#${gradientId})`} />
        </Svg>
      ) : null}
      {children}
    </View>
  );
}
