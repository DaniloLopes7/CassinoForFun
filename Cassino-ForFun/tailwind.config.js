// tailwind.config.js
module.exports = {
  mode: 'jit',

  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],

  theme: {
    extend: {
      // every other responsive class here is about width, but a game board running off
      // the bottom of a 1366x768 laptop is a height problem: the board is sized from its
      // width and never asked how much room it had. `short` is the missing axis.
      screens: {
        short: { raw: "(max-height: 800px)" },
        // the boards need their space back well before a screen properly short: at 900px
        // the page title alone was still pushing the card past the fold
        stage: { raw: "(max-height: 1000px)" },
      },

      // one ordering for everything that can cover something else. the site has had three
      // separate incidents from picking a number inline: the category bar over the login
      // form, the leaderboard over the category bar, each fix breaking the next thing.
      // put a layer here and use its name; never write a bare z-40 into a component.
      zIndex: {
        raised: '10',   // page content that lifts: a podium, a hovered card, a marker
        sticky: '20',   // pinned to the viewport while the page scrolls under it
        overlay: '40',  // header panels, menus, the login flow
        modal: '60',
        tooltip: '70',  // follows the cursor, so it clears everything
      },

      animation: {
        'spin-fast': 'spin-fast 5s linear infinite',
        'spin-slow': 'spin-slow 2s linear infinite',
      },
      keyframes: {
        'spin-fast': {
          '0%': { transform: 'rotateY(0deg)' },
          '100%': { transform: 'rotateY(360deg)' },
        },
        'spin-slow': {
          '0%': { transform: 'rotateY(0deg)' },
          '100%': { transform: 'rotateY(60deg)' },
        },
      },
      colors: {
        'primary': '#000000',
        'primary-light': '#0A0A0A',
        'secondary': '#D4AF37', // Gold Champagne
        'secondary-light': '#F1D592',
        'unique': '#F8191B',   // Ruby Red

        surface: {
          page: '#000000',
          deep: '#050505',
          nav: '#0A0A0A',
          DEFAULT: '#111111',
          raised: '#1A1A1A',
          hover: '#222222',
        },
        line: {
          DEFAULT: '#222222',
          strong: '#D4AF37',
        },
        ink: {
          DEFAULT: '#FCFCFC',
          soft: '#A0A0A0',
          muted: '#666666',
          faint: '#333333',
        },
        accent: {
          DEFAULT: '#D4AF37', // Gold
          light: '#F1D592',
          gold: '#D4AF37',
          ruby: '#F8191B',
        },
        skeleton: {
          base: '#111111',
          highlight: '#0A0A0A',
        },
      },
    },
  },
  variants: {},
  plugins: [],
}
