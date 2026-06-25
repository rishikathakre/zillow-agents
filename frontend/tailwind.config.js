/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#F8FAFC',
          1: '#FFFFFF',
          2: '#F8FAFC',
          3: '#F1F5F9',
          border: '#E2E8F0',
        },
        ink: {
          DEFAULT: '#0F172A',
          muted: '#475569',
          faint: '#94A3B8',
        },
        accent: {
          blue: '#0EA5E9',
          'blue-hover': '#0284C7',
          'blue-light': '#E0F2FE',
          'blue-border': '#BAE6FD',
          'blue-glow': 'rgba(14,165,233,0.12)',
          teal: '#10B981',
          amber: '#F59E0B',
          red: '#EF4444',
        },
        sidebar: {
          DEFAULT: '#0C1A2E',
          border: 'rgba(255,255,255,0.06)',
          active: 'rgba(14,165,233,0.15)',
          'active-text': '#38BDF8',
        },
        hero: {
          DEFAULT: '#F0F9FF',
          border: '#BAE6FD',
        },
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 16px rgba(14,165,233,0.12), 0 1px 4px rgba(0,0,0,0.04)',
        'glow-blue': '0 0 0 3px rgba(14,165,233,0.12)',
      },
    },
  },
  plugins: [],
};
