import { cva, type VariantProps } from "class-variance-authority";
import * as Haptics from "expo-haptics";
import React from "react";
import { Pressable, Text, ViewStyle } from "react-native";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "flex-row items-center justify-center rounded-2xl active:opacity-90",
  {
    variants: {
      variant: {
        default: "bg-primary",
        secondary: "bg-card-elevated border border-border",
        ghost: "bg-transparent",
        success: "bg-success/15 border border-success/40",
        outline: "border border-primary/50 bg-primary/10",
      },
      size: {
        default: "h-12 px-5",
        sm: "h-9 px-3",
        lg: "h-14 px-6",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

const textVariants = cva("font-semibold", {
  variants: {
    variant: {
      default: "text-primary-foreground text-base",
      secondary: "text-foreground text-base",
      ghost: "text-muted text-base",
      success: "text-success text-base",
      outline: "text-primary text-base",
    },
    size: { default: "", sm: "text-sm", lg: "text-lg" },
  },
  defaultVariants: { variant: "default", size: "default" },
});

interface ButtonProps extends VariantProps<typeof buttonVariants> {
  label?: string;
  onPress?: () => void;
  disabled?: boolean;
  haptic?: boolean;
  className?: string;
  children?: React.ReactNode;
  style?: ViewStyle;
}

export function Button({
  label,
  onPress,
  disabled,
  haptic = true,
  variant,
  size,
  className,
  children,
  style,
}: ButtonProps) {
  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress?.();
      }}
      style={({ pressed }) => [
        { transform: [{ scale: pressed ? 0.97 : 1 }], opacity: disabled ? 0.4 : 1 },
        style,
      ]}
      className={cn(buttonVariants({ variant, size }), className)}
    >
      {children ?? (
        <Text className={textVariants({ variant, size })}>{label}</Text>
      )}
    </Pressable>
  );
}
