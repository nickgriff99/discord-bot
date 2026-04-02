import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    path.join(__dirname, 'index.html'),
    path.join(__dirname, 'src/**/*.{ts,tsx}')
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#0c0c0c',
          raised: '#141414',
          card: '#1a1a1a',
          border: '#2a2a2a'
        },
        accent: {
          DEFAULT: '#ef4444',
          bright: '#f87171',
          dim: 'rgba(239, 68, 68, 0.12)'
        }
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        display: ['"Outfit"', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        glow: '0 0 80px -20px rgba(239, 68, 68, 0.35)'
      },
      backgroundImage: {
        'grid-pattern':
          'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)'
      }
    }
  },
  plugins: []
};
