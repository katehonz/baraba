import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react"

const config = defineConfig({
  theme: {
    semanticTokens: {
      colors: {
        bg: {
          DEFAULT: { value: { _light: "#F8FAFC", _dark: "#0F172A" } }, // Slate 50 / Slate 900
          subtle: { value: { _light: "#F1F5F9", _dark: "#1E293B" } }, // Slate 100 / Slate 800
          muted: { value: { _light: "#F1F5F9", _dark: "#1E293B" } },
          canvas: { value: { _light: "#F8FAFC", _dark: "#0F172A" } },
          panel: { value: { _light: "#FFFFFF", _dark: "#1E293B" } }, // White / Slate 800
          sidebar: { value: { _light: "#FFFFFF", _dark: "#1E293B" } }, // White / Slate 800
        },
        fg: {
          DEFAULT: { value: { _light: "#334155", _dark: "#F1F5F9" } }, // Slate 700 / Slate 100
          muted: { value: { _light: "#64748B", _dark: "#94A3B8" } }, // Slate 500 / Slate 400
          subtle: { value: { _light: "#94A3B8", _dark: "#64748B" } },
        },
        border: {
          DEFAULT: { value: { _light: "#E2E8F0", _dark: "#334155" } }, // Slate 200 / Slate 700
          muted: { value: { _light: "#F1F5F9", _dark: "#1E293B" } },
        },
        primary: {
          DEFAULT: { value: { _light: "#3B82F6", _dark: "#60A5FA" } }, // Blue 500 / Blue 400
          muted: { value: { _light: "#60A5FA", _dark: "#3B82F6" } },
        },
      },
    },
  },
})

export const system = createSystem(defaultConfig, config)
