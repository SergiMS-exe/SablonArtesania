/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}',
    ],
    theme: {
        extend: {
            fontFamily: {
                artesanal: ['"Cormorant Upright"', 'serif'],
            },
        },
    },
    plugins: [],
};
