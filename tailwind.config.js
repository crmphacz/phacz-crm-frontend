/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: '#d55006',
        'brand-light': '#eb5f18',
        'brand-dark': '#a83f05',
        'brand-olive': '#79785a',
        'brand-cream': '#e6e3de',
        sidebar: '#1e1e1e',
        'sidebar-hover': '#292929',
        'text-primary': '#333333',
      },
      fontFamily: {
        questrial: ['Plus Jakarta Sans', 'sans-serif'],
        nunito: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 16px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)',
        panel: '−4px 0 24px rgba(0,0,0,0.12)',
      },
    },
  },
  plugins: [],
}
