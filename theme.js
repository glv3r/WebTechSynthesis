// Shared Tailwind theme for every page. Load right after the Tailwind CDN script.
tailwind.config = {
  theme: {
    extend: {
      colors: {
        paper: '#E9EEF3',
        'paper-2': '#F4F7FA',
        grid: '#CBD8E4',
        ink: '#132039',
        'ink-soft': '#5A6B84',
        dim: '#A8B8C9',
        teal: '#0C7C66',
        marigold: '#D98A0B',
        ultra: '#3341C4',
        crimson: '#C63A55',
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'sans-serif'],
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
};
