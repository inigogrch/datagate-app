import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Helper function to convert CSS variable to Tailwind color
export function cssVar(variable: string) {
  return `var(--${variable})`
}
