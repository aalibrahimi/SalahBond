import React from "react";
import { Text, View, ViewProps } from "react-native";
import { cn } from "@/lib/utils";

export function Card({
  className,
  ...props
}: ViewProps & { className?: string }) {
  return (
    <View
      className={cn("rounded-3xl border border-border bg-card p-5", className)}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Text className={cn("text-lg font-bold text-foreground", className)}>
      {children}
    </Text>
  );
}

export function Muted({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <Text className={cn("text-sm text-muted", className)}>{children}</Text>;
}
