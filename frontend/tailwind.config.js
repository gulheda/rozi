/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        danger: "#dc2626",
        warning: "#d97706",
        safe: "#16a34a",
      },
    },
  },
  plugins: [],
}

