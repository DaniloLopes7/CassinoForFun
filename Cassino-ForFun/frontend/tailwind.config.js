/** @type {import('tailwindcss').Config} */
// DBET Design System — "Luxo moderno" (preto-carvao, roxo profundo, dourado)
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: '#0F0F14', // preto-carvao (fundo global)
        deep: '#1B1030', // roxo profundo (superficie)
        surface: '#22153C', // roxo elevado
        card: '#2A1B47', // cartas / areas internas
        line: '#3A2B5C', // bordas
        gold: {
          DEFAULT: '#F5C542', // dourado (destaque)
          dim: '#C79A2E',
          bright: '#FFE08A',
        },
        danger: '#D7263D', // vermelho-cassino
        felt: '#0B6B4B', // verde-feltro (ganhos)
        ink: {
          DEFAULT: '#F4F2FA', // branco-gelo
          muted: '#A79FC4', // texto secundario
          faint: '#6A6290', // texto terciario
        },
      },
      fontFamily: {
        display: ['Righteous', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      spacing: {
        18: '4.5rem',
      },
      boxShadow: {
        goldglow: '0 0 24px rgba(245,197,66,0.25)',
        card: '0 4px 24px rgba(0,0,0,0.45)',
      },
      keyframes: {
        pop: { '0%': { transform: 'scale(.8)', opacity: '0' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        pulseGold: { '0%,100%': { boxShadow: '0 0 0 rgba(245,197,66,0)' }, '50%': { boxShadow: '0 0 28px rgba(245,197,66,.45)' } },
      },
      animation: {
        pop: 'pop .2s ease-out',
        shimmer: 'shimmer 1.8s linear infinite',
        pulseGold: 'pulseGold 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
