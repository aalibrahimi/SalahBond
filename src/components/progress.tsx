import { MotiView } from "moti";
import React, { useEffect, useState } from "react";
import { View, ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const GOLD = "#E5B45B";
const TRACK = "#1F2C47";
const GREEN = "#34D399";

/**
 * A single animated ring (0–1). Children render in the centre.
 */
export function ProgressRing({
  progress,
  size = 64,
  stroke = 7,
  color = GOLD,
  track = TRACK,
  duration = 900,
  children,
  style,
}: {
  progress: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  duration?: number;
  children?: React.ReactNode;
  style?: ViewStyle;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withTiming(Math.min(1, Math.max(0, progress)), {
      duration,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress, duration, p]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: c * (1 - p.value),
  }));

  return (
    <View style={[{ width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={track}
          strokeWidth={stroke}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${c} ${c}`}
          animatedProps={animatedProps}
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {children}
      </View>
    </View>
  );
}

/**
 * Segmented "prayer wheel" — one arc per prayer, like a pie with gaps.
 * Filled arcs light up in order; the whole wheel pulses in on mount.
 */
export function PrayerWheel({
  segments,
  size = 92,
  stroke = 10,
  gapDeg = 8,
  color = GOLD,
  doneColor = GREEN,
  track = TRACK,
  children,
}: {
  /** true = prayed, false = not yet */
  segments: boolean[];
  size?: number;
  stroke?: number;
  gapDeg?: number;
  color?: string;
  doneColor?: string;
  track?: string;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const n = Math.max(1, segments.length);
  const segDeg = 360 / n;
  const arcDeg = segDeg - gapDeg;
  const arcLen = (arcDeg / 360) * c;
  const allDone = segments.length > 0 && segments.every(Boolean);

  return (
    <MotiView
      from={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", damping: 14 }}
      style={{ width: size, height: size }}
    >
      <Svg width={size} height={size}>
        {segments.map((on, i) => (
          <Segment
            key={i}
            on={on}
            index={i}
            size={size}
            r={r}
            c={c}
            stroke={stroke}
            arcLen={arcLen}
            rotation={-90 + i * segDeg + gapDeg / 2}
            color={allDone ? doneColor : color}
            track={track}
          />
        ))}
      </Svg>
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {children}
      </View>
    </MotiView>
  );
}

function Segment({
  on,
  index,
  size,
  r,
  c,
  stroke,
  arcLen,
  rotation,
  color,
  track,
}: {
  on: boolean;
  index: number;
  size: number;
  r: number;
  c: number;
  stroke: number;
  arcLen: number;
  rotation: number;
  color: string;
  track: string;
}) {
  // Each lit segment draws itself in with a small stagger.
  const fill = useSharedValue(0);
  useEffect(() => {
    fill.value = withTiming(on ? 1 : 0, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    });
  }, [on, fill]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: arcLen * (1 - fill.value),
    opacity: 0.35 + 0.65 * fill.value,
  }));

  const common = {
    cx: size / 2,
    cy: size / 2,
    r,
    strokeWidth: stroke,
    fill: "none" as const,
    strokeLinecap: "round" as const,
    strokeDasharray: `${arcLen} ${c}`,
    rotation,
    origin: `${size / 2}, ${size / 2}`,
  };

  return (
    <>
      <Circle {...common} stroke={track} />
      <AnimatedCircle {...common} stroke={color} animatedProps={animatedProps} />
    </>
  );
}

/**
 * Horizontal bar (0–1) that grows in. Measures its own width so the
 * animation is in pixels (Reanimated-safe) rather than percentages.
 */
export function ProgressBar({
  progress,
  height = 10,
  color = GOLD,
  track = TRACK,
  delay = 0,
  style,
}: {
  progress: number;
  height?: number;
  color?: string;
  track?: string;
  delay?: number;
  style?: ViewStyle;
}) {
  const [width, setWidth] = useState(0);
  const target = width * Math.min(1, Math.max(0, progress));

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[
        {
          height,
          borderRadius: height / 2,
          backgroundColor: track,
          overflow: "hidden",
        },
        style,
      ]}
    >
      <MotiView
        from={{ width: 0 }}
        animate={{ width: target }}
        transition={{ type: "timing", duration: 800, delay }}
        style={{ height, borderRadius: height / 2, backgroundColor: color }}
      />
    </View>
  );
}

/** Staggered fade-up for lists of cards. */
export function FadeUp({
  index = 0,
  children,
  className,
  style,
}: {
  index?: number;
  children: React.ReactNode;
  className?: string;
  style?: ViewStyle;
}) {
  return (
    <MotiView
      from={{ opacity: 0, translateY: 14 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 380, delay: 70 * index }}
      className={className}
      style={style}
    >
      {children}
    </MotiView>
  );
}
