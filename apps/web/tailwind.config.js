/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#15231f",
        moss: "#2c6b5a",
        mist: "#ebefe9",
        sand: "#f3f1eb",
        cloud: "#fcfcf9",
        steel: "#5e6b67"
      },
      fontFamily: {
        sans: ["Instrument Sans", "ui-sans-serif", "system-ui"],
        display: ["Poppins", "Instrument Sans", "ui-sans-serif", "system-ui"]
      },
      boxShadow: {
        panel: "0 16px 40px rgba(18, 32, 28, 0.06)"
      }
    }
  },
  plugins: []
};
