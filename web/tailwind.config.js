/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {},
  },
  // Tailwind expects an array here; an object will crash with `plugins.forEach is not a function`.
  plugins: [],
};