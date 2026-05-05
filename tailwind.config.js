/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        gray: {
          950: '#0a0a0f',
        },
        amber: {
          50:  '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-sm':  '0 0 20px -4px rgba(251,191,36,0.12)',
        'glow':     '0 0 35px -6px rgba(251,191,36,0.18)',
        'glow-lg':  '0 0 50px -8px rgba(251,191,36,0.22)',
      },
      backgroundImage: {
        'radial-amber': 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(251,191,36,0.07), transparent)',
      },
    },
  },
  plugins: [],
};
