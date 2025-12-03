/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './index.html',
        './src/**/*.{js,ts,jsx,tsx}',
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                brand: {
                    50: '#eef2ff',
                    100: '#e0e7ff',
                    200: '#c7d2fe',
                    300: '#a5b4fc',
                    400: '#818cf8',
                    500: '#6366f1',
                    600: '#4f46e5',
                    700: '#4338ca',
                    800: '#3730a3',
                    900: '#312e81',
                },
            },
            backgroundImage: {
                'radial-faded': 'radial-gradient(ellipse at top, rgba(99,102,241,0.25), transparent 60%)',
                'grid-slate': 'linear-gradient(rgba(100,116,139,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(100,116,139,0.2) 1px, transparent 1px)',
            },
            backgroundSize: {
                'grid-16': '16px 16px',
            },
            boxShadow: {
                glow: '0 0 0 1px rgba(99,102,241,0.4), 0 8px 30px rgba(99,102,241,0.35)',
            },
        },
    },
    plugins: [],
}
