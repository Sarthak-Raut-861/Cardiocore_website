/**
 * Utility functions for CardioCore Next.js foundation
 */

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
