import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { CSSProperties } from "react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Shows a photo's dominant-color swatch as an instant background while its image loads. */
export function colorPlaceholderStyle(color?: string): CSSProperties | undefined {
  return color ? { backgroundColor: color } : undefined;
}
