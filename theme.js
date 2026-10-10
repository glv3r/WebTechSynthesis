/* =====================================================================
   theme.js: Tailwind settings shared by every page
   ---------------------------------------------------------------------
   Load this right after the Tailwind CDN script. It adds our own
   colours and fonts so we can write classes like `bg-pink` or
   `font-display`, based on Gumroad's design system.
   ===================================================================== */
tailwind.config = {
  theme: {
    extend: {
      // Gumroad palette
      colors: {
        cream: '#F4F4F0',  // page background
        ink: '#000000',    // text and every border
        pink: '#FF90E8',   // brand accent (active tab, lead kicker)
        yellow: '#FFC900', // ticker band, "sample data" warning
        orange: '#FF7051',
        purple: '#90A8ED',
        green: '#23A094',  // winners, "live data" chip
        red: '#DC341E',    // LIVE match indicator
      },
      // Gumroad uses Mabry Pro (paid). Space Grotesk + DM Sans are close free stand-ins.
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      // Gumroad's signature hard shadow (no blur)
      boxShadow: {
        hard: '4px 4px 0 0 #000',
      },
    },
  },
};
