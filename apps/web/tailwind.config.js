/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Instrument Sans", "ui-sans-serif", "system-ui"],
        display: ["Poppins", "Instrument Sans", "ui-sans-serif", "system-ui"]
      }
    }
  },
  plugins: []
};
