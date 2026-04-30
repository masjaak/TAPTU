/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#10211c",
        moss: "#1f8f6c",
        mist: "#edf2ea",
        sand: "#f7f6f1",
        cloud: "#fefefe"
      },
      fontFamily: {
        sans: ["Poppins", "ui-sans-serif", "system-ui"]
      },
      boxShadow: {
        panel: "0 18px 60px rgba(15, 32, 27, 0.08)"
      }
    }
  },
  plugins: []
};
