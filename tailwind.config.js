/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./App.tsx",
        "./index.tsx"
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['"Inter Tight Variable"', '"Inter Tight"', 'Inter', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            colors: {
                accent: {
                    DEFAULT: 'var(--accent-color)',
                    hover: 'var(--accent-hover)',
                    pressed: 'var(--accent-pressed)',
                    subtle: 'var(--accent-subtle)',
                },
            },
            borderRadius: {
                DEFAULT: '0px',
                sm: '0px',
                md: '0px',
                lg: '0px',
                xl: '0px',
                '2xl': '0px',
                pill: '9999px',
            },
            boxShadow: {
                popover: 'var(--shadow-popover)',
            },
            animation: {
                'fade-in': 'fadeIn 0.15s ease-out',
                'zoom-in-95': 'zoomIn95 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                zoomIn95: {
                    '0%': { opacity: '0', transform: 'scale(0.95)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                }
            }
        },
    },
    plugins: [],
}
