/**
 * CardioCore Design Tokens
 * 
 * Centralized design tokens derived directly from the original CardioCore
 * UI/UX System (originally defined in src/00_head.html).
 * Preserves the exact color values, typography, radii, spacing, and elevation
 * for both Light Clinical Theme and Dark Clinical-Tech Theme.
 */

export const tokens = {
  colors: {
    light: {
      // Surfaces
      bg: "#F2FAF9",
      surface: "#FFFFFF",
      surface2: "#F6FCFB",
      elevated: "#FFFFFF",
      tint: "#E9F7F6",
      tint2: "#DDF2F1",
      border: "#D5EAE8",
      border2: "#BCE0DD",

      // Brand & Data
      teal: "#0E9E9E",
      teal600: "#0B8788",
      teal700: "#0A6F72",
      tealInk: "#073C40",
      tealSoft: "#DFF5F4",
      cyan: "#12A6CF",
      cyanSoft: "#E1F4FB",
      green: "#12A06A",
      greenSoft: "#E2F7EE",
      violet: "#7A6BF0",
      violetSoft: "#EEECFE",
      amber: "#D98314",
      amberSoft: "#FDF1DF",
      red: "#E0453F",
      redSoft: "#FDE8E7",

      // Text
      hi: "#0A2B2F",
      mid: "#37646A",
      muted: "#6E9A9E",
    },
    dark: {
      // Native design system dark palette
      bg: "#071C21",
      surface: "#0C272D",
      surface2: "#0F2E35",
      elevated: "#123138",
      tint: "#12343A",
      tint2: "#1A454C",
      border: "#1D454D",
      border2: "#2C6069",

      // Brand & Data
      teal: "#2FD3C0",
      teal600: "#28C0AF",
      teal700: "#7FE6D8",
      tealInk: "#EAF7F6",
      tealSoft: "#0F3739",
      cyan: "#4FC7E8",
      cyanSoft: "#0D2F38",
      green: "#3ED69A",
      greenSoft: "#0D3227",
      violet: "#A79BFB",
      violetSoft: "#1B1A3B",
      amber: "#F0B25C",
      amberSoft: "#33260F",
      red: "#FF7A72",
      redSoft: "#3A1A19",

      // Text
      hi: "#EAF7F6",
      mid: "#A7CDD1",
      muted: "#7CA6AB",
    },
  },
  typography: {
    fonts: {
      display: 'var(--font-sora), "Sora", system-ui, -apple-system, sans-serif',
      body: 'var(--font-manrope), "Manrope", system-ui, -apple-system, sans-serif',
      mono: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
    },
  },
  radii: {
    r10: "10px",
    r16: "16px",
    r20: "20px",
    r28: "28px",
    pill: "999px",
  },
  spacing: {
    s1: "4px",
    s2: "8px",
    s3: "12px",
    s4: "16px",
    s5: "24px",
    s6: "32px",
    s7: "48px",
    s8: "72px",
  },
  elevation: {
    light: {
      sh1: "0 1px 2px rgba(9,60,64,.05), 0 1px 3px rgba(9,60,64,.04)",
      sh2: "0 4px 14px rgba(9,60,64,.07), 0 1px 3px rgba(9,60,64,.05)",
      sh3: "0 18px 44px rgba(9,60,64,.11), 0 2px 8px rgba(9,60,64,.05)",
      sh4: "0 34px 80px rgba(7,60,64,.16)",
      ring: "0 0 0 4px rgba(14,158,158,.14)",
    },
    dark: {
      sh1: "0 1px 2px rgba(0,0,0,.45), 0 1px 3px rgba(0,0,0,.35)",
      sh2: "0 4px 14px rgba(0,0,0,.5), 0 1px 3px rgba(0,0,0,.35)",
      sh3: "0 18px 44px rgba(0,0,0,.55), 0 2px 8px rgba(0,0,0,.35)",
      sh4: "0 34px 80px rgba(0,0,0,.65)",
      ring: "0 0 0 4px rgba(47,211,192,.22)",
    },
  },
} as const;

export type ThemeMode = "light" | "dark";
