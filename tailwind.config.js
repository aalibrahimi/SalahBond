/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#0A0F1E",
        foreground: "#EEF2FA",
        card: "#111A2E",
        "card-elevated": "#18233B",
        border: "#1F2C47",
        muted: "#8494B4",
        primary: {
          DEFAULT: "#E5B45B",
          foreground: "#1A1205",
        },
        success: "#34D399",
        danger: "#FB7185",
        fajr: "#6366F1",
        zuhrayn: "#38BDF8",
        maghribayn: "#F59E0B",
      },
      fontFamily: {
        arabic: ["Amiri_400Regular"],
        "arabic-bold": ["Amiri_700Bold"],
      },
      borderRadius: {
        xl: "16px",
        "2xl": "22px",
        "3xl": "28px",
      },
    },
  },
  plugins: [],
};
