/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)', surface: 'var(--surface)', elevated: 'var(--elevated)', ink: 'var(--text)', muted: 'var(--muted)',
        line: 'var(--border)', accent: 'var(--accent)', 'accent-hover': 'var(--accent-hover)', 'on-accent': 'var(--on-accent)',
        ok: 'var(--ok)', warn: 'var(--warn)', danger: 'var(--danger)',
      },
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Noto Sans Devanagari', 'sans-serif'] },
      borderRadius: { card: '14px', ctl: '10px' },
      boxShadow: { soft: '0 1px 2px rgba(15,23,42,.05), 0 4px 16px rgba(15,23,42,.05)' },
    },
  },
  plugins: [],
};
