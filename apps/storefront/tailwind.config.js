/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require("@repo/ui/tailwind.preset")],
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#005FD5",
          hover: "#004FB5",
          dark: "#003F91",
          light: "#E8F1FF",
          soft: "#F4F8FF",
        },
        primary: {
          DEFAULT: "#005FD5",
          container: "#005FD5",
          hover: "#004FB5",
        },
        "on-primary-container": "#FFFFFF",
        "outline-variant": "#E2E8F0",
        surface: {
          DEFAULT: "#F8FAFC",
          dim: "#F1F5F9",
          variant: "#333539",
          "container-lowest": "#FFFFFF",
          "container-low": "#F8FAFC",
        },
        "on-surface": "#0F172A",
        "on-surface-variant": "#64748B",
      },
    },
  },
};
