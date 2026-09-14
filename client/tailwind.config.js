/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Command Center Palette
        command: {
          bg: '#0F172A',       // deep slate navy
          surface: '#1E293B',  // primary surface
          card: '#243044',     // card container
          cardHover: '#2E3D56',
          border: '#334155',
          borderSubtle: '#1E293B'
        },
        // Semantic Risk Colors
        risk: {
          safe: '#22C55E',     // Green
          watch: '#EAB308',    // Yellow
          warning: '#F97316',  // Orange
          danger: '#DC2626',   // Red
        },
        // Sensor Status Colors
        sensor: {
          online: '#22C55E',
          offline: '#94A3B8',  // Neutral Gray
          faulty: '#F97316',   // Orange Anomaly
        },
        // Operational Calm Accent
        accent: {
          DEFAULT: '#0EA5E9',
          hover: '#0284C7',
          muted: 'rgba(14, 165, 233, 0.15)'
        }
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'pulse-danger': 'pulseDanger 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'beacon': 'beacon 1.8s ease-out infinite',
      },
      keyframes: {
        pulseDanger: {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 0 0 rgba(220, 38, 38, 0.7)' },
          '50%': { opacity: '0.85', boxShadow: '0 0 0 12px rgba(220, 38, 38, 0)' },
        },
        beacon: {
          '0%': { transform: 'scale(0.8)', opacity: '1' },
          '100%': { transform: 'scale(2.4)', opacity: '0' }
        }
      }
    },
  },
  plugins: [],
}
