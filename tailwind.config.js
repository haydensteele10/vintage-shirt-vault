/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // True OLED black scale
        gray: {
          50:  '#F5F5F5',
          100: '#E5E5E5',
          200: '#CCCCCC',
          300: '#AAAAAA',
          400: '#888888',
          500: '#666666',
          600: '#444444',
          700: '#2A2A2A',
          800: '#1A1A1A',
          900: '#0D0D0D',
          950: '#0A0A0A',
        },
        // Teal primary accent — replaces blue
        amber: {
          50:  '#E0FBF6',
          100: '#B3F5EC',
          200: '#80F0E0',
          300: '#4EEBD0',
          400: '#00E8BB',
          500: '#00D4AA',
          600: '#00B894',
          700: '#009B7D',
          800: '#007D64',
          900: '#006050',
        },
      },
      fontFamily: {
        sans:      ['DM Sans', 'system-ui', 'sans-serif'],
        serif:     ['Merriweather', 'Georgia', 'serif'],
        display:   ['Abril Fatface', 'Georgia', 'serif'],
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
