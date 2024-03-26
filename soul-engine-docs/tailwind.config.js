/** @type {import('tailwindcss').Config} */

module.exports = {
  darkMode: "class",
  content: [
    './pages/**/*.{js,jsx,ts,tsx,md,mdx}',
    './components/**/*.{js,jsx,ts,tsx,md,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        OS_extralight: ["CabinetGrotesk-ExtraLight", "sans-serif"],
        OS_light: ["CabinetGrotesk-Light", "sans-serif"],
        OS_regular: ["CabinetGrotesk-Regular", "sans-serif"],
        OS_medium: ["CabinetGrotesk-Medium", "sans-serif"],
        OS_bold: ["CabinetGrotesk-Bold", "sans-serif"],
        OS_extrabold: ["CabinetGrotesk-ExtraBold", "sans-serif"],
        OS_black: ["CabinetGrotesk-Black", "sans-serif"],
        OS_mono_light: ["IntelOneMono-Light", "monospace"],
        OS_mono_lightitalic: ["IntelOneMono-LightItalic", "monospace"],
        OS_mono_regular: ["IntelOneMono-Regular", "monospace"],
        OS_mono_italic: ["IntelOneMono-Italic", "monospace"],
        OS_mono_medium: ["IntelOneMono-Medium", "monospace"],
        OS_mono_medium_italic: ["IntelOneMono-MediumItalic", "monospace"],
        OS_mono_bold: ["IntelOneMono-Bold", "monospace"],
        OS_mono_bold_italic: ["IntelOneMono-BoldItalic", "monospace"],
      },
      colors: {},
    },
  },
  plugins: [],
};
