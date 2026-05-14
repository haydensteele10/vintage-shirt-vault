/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Warm vintage palette — dark brown / cream / rust
        gray: {
          50:  '#F5F0E8',
          100: '#EAE3D8',
          200: '#D8CEBC',
          300: '#C4B49A',
          400: '#A89070',
          500: '#8A7458',
          600: '#6B5840',
          700: '#504030',
          800: '#3A2E1C',
          900: '#2A1F10',
          950: '#1A1209',
        },
        // Rust accent replaces amber gold
        amber: {
          50:  '#FEF3EB',
          100: '#FDE0CC',
          200: '#FAC4A0',
          300: '#F0A070',
          400: '#D4641A',
          500: '#C4541A',
          600: '#A84214',
          700: '#8A320E',
          800: '#6C2408',
          900: '#501A06',
        },
      },
      fontFamily: {
        sans:      ['DM Sans', 'system-ui', 'sans-serif'],
        serif:     ['Playfair Display', 'Georgia', 'serif'],
        condensed: ['Barlow Condensed', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-sm':  'none',
        'glow':     'none',
        'glow-lg':  'none',
      },
      backgroundImage: {
        'radial-amber': 'none',
      },
    },
  },
  plugins: [],
};
