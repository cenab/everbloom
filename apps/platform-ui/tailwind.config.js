/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Design system: no pure black or white
        // Calm, ceremonial palette
        neutral: {
          50: '#FAFAF9',
          100: '#F5F5F4',
          200: '#E7E5E4',
          300: '#D6D3D1',
          400: '#A8A29E',
          500: '#78716C',
          600: '#57534E',
          700: '#44403C',
          800: '#292524',
          900: '#1C1917',
        },
        primary: {
          50: '#FDF8F6',
          100: '#F9EDE7',
          200: '#F2D9CD',
          300: '#E8BDA8',
          400: '#D99A7C',
          500: '#C97B5A',
          600: '#B5624A',
          700: '#964D3D',
          800: '#7A4236',
          900: '#653A31',
        },
        accent: {
          50: '#F6F7F6',
          100: '#E3E6E2',
          200: '#C8CEC5',
          300: '#A4AE9E',
          400: '#7F8D77',
          500: '#64725C',
          600: '#4F5A49',
          700: '#41493C',
          800: '#363D33',
          900: '#2F342C',
        },
      },
      fontFamily: {
        // Typography locked per design system
        serif: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
