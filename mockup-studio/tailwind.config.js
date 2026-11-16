const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: token('primary'),
        'primary-hover': token('primary-hover'),
        'primary-soft': token('primary-soft'),
        'primary-ink': token('primary-ink'),
        'on-primary': token('on-primary'),
        bg: token('bg'),
        surface: token('surface'),
        text: token('text'),
        muted: token('muted'),
        border: token('border'),
        ink: token('ink'),
      },
      fontFamily: {
        sans: ['"Inter Tight Variable"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono Variable"', 'ui-monospace', 'monospace'],
        hand: ['Caveat', 'cursive'],
      },
      borderRadius: { card: '16px', control: '10px' },
      keyframes: {
        marquee: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
        float: { '0%,100%': { transform: 'translateY(0) rotate(var(--r,0deg))' }, '50%': { transform: 'translateY(-8px) rotate(var(--r,0deg))' } },
      },
      animation: { marquee: 'marquee 38s linear infinite', float: 'float 6s ease-in-out infinite' },
    },
  },
  plugins: [],
};
