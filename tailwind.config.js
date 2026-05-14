/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Slate palette — dark navy / slate-blue / off-white
        gray: {
          50:  '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
          950: '#0B1120',
        },
        // Blue primary accent — replaces rust/amber
        amber: {
          50:  '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#2563EB',
          600: '#1D4ED8',
          700: '#1E40AF',
          800: '#1E3A8A',
          900: '#1E3375',
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
