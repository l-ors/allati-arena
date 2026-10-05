// Hand-drawn SVG icons (no emojis). Used via <span class="icon" data-icon="name">
const ICONS = {
  paw: `<svg viewBox="0 0 64 64"><g fill="currentColor">
    <ellipse cx="32" cy="42" rx="13" ry="11"/>
    <ellipse cx="13" cy="28" rx="6" ry="8"/><ellipse cx="25" cy="16" rx="6" ry="8"/>
    <ellipse cx="39" cy="16" rx="6" ry="8"/><ellipse cx="51" cy="28" rx="6" ry="8"/></g></svg>`,

  shop: `<svg viewBox="0 0 64 64">
    <rect x="10" y="28" width="44" height="28" rx="3" fill="#d9a066" stroke="#5a3515" stroke-width="3"/>
    <rect x="25" y="38" width="14" height="18" fill="#8a5a2b" stroke="#5a3515" stroke-width="3"/>
    <path d="M6 12 H58 L55 28 H9 Z" fill="#fff6e0" stroke="#5a3515" stroke-width="3" stroke-linejoin="round"/>
    <path d="M14 12 H24 L23 28 H13 Z M34 12 H44 L44 28 H33 Z" fill="#e05a47"/>
    <path d="M6 12 H58 L55 28 H9 Z" fill="none" stroke="#5a3515" stroke-width="3" stroke-linejoin="round"/></svg>`,

  deck: `<svg viewBox="0 0 64 64">
    <rect x="8" y="14" width="28" height="38" rx="5" transform="rotate(-12 22 33)" fill="#8fd0ea" stroke="#23405e" stroke-width="3"/>
    <rect x="26" y="10" width="28" height="38" rx="5" transform="rotate(10 40 29)" fill="#ffd66b" stroke="#6b4a1d" stroke-width="3"/>
    <g fill="#6b4a1d" transform="rotate(10 40 29)">
      <ellipse cx="40" cy="33" rx="6" ry="5"/><circle cx="33" cy="26" r="2.6"/><circle cx="38" cy="22" r="2.6"/>
      <circle cx="43" cy="22" r="2.6"/><circle cx="47" cy="26" r="2.6"/></g></svg>`,

  battle: `<svg viewBox="0 0 64 64">
    <path d="M32 5 L55 13 V30 C55 45 45 54 32 59 C19 54 9 45 9 30 V13 Z" fill="#e05a47" stroke="#6b1d1d" stroke-width="3" stroke-linejoin="round"/>
    <g fill="#fff6e0"><ellipse cx="32" cy="38" rx="8" ry="7"/><circle cx="21" cy="28" r="3.8"/>
      <circle cx="28" cy="21" r="3.8"/><circle cx="36" cy="21" r="3.8"/><circle cx="43" cy="28" r="3.8"/></g></svg>`,

  trophy: `<svg viewBox="0 0 64 64">
    <path d="M20 16 H11 C11 27 15 31 21 31 M44 16 H53 C53 27 49 31 43 31" fill="none" stroke="#7a5a10" stroke-width="4"/>
    <path d="M19 9 H45 V25 C45 34 39 40 32 40 C25 40 19 34 19 25 Z" fill="#ffc93c" stroke="#7a5a10" stroke-width="3"/>
    <rect x="28" y="40" width="8" height="8" fill="#ffc93c" stroke="#7a5a10" stroke-width="3"/>
    <rect x="18" y="48" width="28" height="9" rx="2" fill="#a0692f" stroke="#5a3a10" stroke-width="3"/></svg>`,

  // Feed = our "elixir": a golden ear of wheat
  feed: `<svg viewBox="0 0 64 64">
    <path d="M32 60 V12" stroke="#7a5a10" stroke-width="3" stroke-linecap="round"/>
    <g fill="#ffcf4a" stroke="#7a5a10" stroke-width="2.5">
      <ellipse cx="32" cy="10" rx="4.5" ry="7"/>
      <ellipse cx="24" cy="21" rx="4.5" ry="7" transform="rotate(-35 24 21)"/>
      <ellipse cx="40" cy="21" rx="4.5" ry="7" transform="rotate(35 40 21)"/>
      <ellipse cx="24" cy="33" rx="4.5" ry="7" transform="rotate(-35 24 33)"/>
      <ellipse cx="40" cy="33" rx="4.5" ry="7" transform="rotate(35 40 33)"/>
      <ellipse cx="24" cy="45" rx="4.5" ry="7" transform="rotate(-35 24 45)"/>
      <ellipse cx="40" cy="45" rx="4.5" ry="7" transform="rotate(35 40 45)"/></g></svg>`,

  lock: `<svg viewBox="0 0 64 64">
    <path d="M21 29 V20 C21 7 43 7 43 20 V29" fill="none" stroke="#5a4a30" stroke-width="5"/>
    <rect x="13" y="28" width="38" height="28" rx="6" fill="#c9b99a" stroke="#5a4a30" stroke-width="3"/>
    <circle cx="32" cy="40" r="4" fill="#5a4a30"/><rect x="30" y="41" width="4" height="8" fill="#5a4a30"/></svg>`,

  gold: `<svg viewBox="0 0 64 64">
    <circle cx="32" cy="32" r="24" fill="#ffc93c" stroke="#8a6010" stroke-width="4"/>
    <circle cx="32" cy="32" r="15" fill="none" stroke="#e0a020" stroke-width="3"/>
    <path d="M22 22 Q28 16 34 18" fill="none" stroke="#fff3c0" stroke-width="4" stroke-linecap="round"/></svg>`,

  gem: `<svg viewBox="0 0 64 64">
    <polygon points="32,4 56,22 46,58 18,58 8,22" fill="#2ed573" stroke="#0e8a4a" stroke-width="3"/>
    <polygon points="32,4 42,22 32,58 22,22" fill="#7bed9f"/>
    <polygon points="32,4 56,22 42,22" fill="#55efc4"/>
    <polygon points="32,4 8,22 22,22" fill="#1dd1a1"/>
    <polygon points="42,22 46,58 32,58" fill="#0e8a4a"/>
    <polygon points="22,22 18,58 32,58" fill="#0e8a4a"/>
    <path d="M22 10 L30 6" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
  </svg>`,

  users: `<svg viewBox="0 0 64 64">
    <circle cx="24" cy="22" r="10" fill="#ffc93c" stroke="#5a3515" stroke-width="3"/>
    <path d="M8 52 C8 38 40 38 40 52 Z" fill="#e05a47" stroke="#5a3515" stroke-width="3"/>
    <circle cx="44" cy="20" r="8" fill="#ffc93c" stroke="#5a3515" stroke-width="3"/>
    <path d="M34 52 C34 40 56 40 56 52 Z" fill="#3b82f6" stroke="#5a3515" stroke-width="3"/>
  </svg>`,

  // Farm chests: plain wood, iron bands, golden bands
  chest_small: `<svg viewBox="0 0 64 64">
    <path d="M8 30 C8 12 56 12 56 30 Z" fill="#c68a4c" stroke="#4a2c12" stroke-width="3" stroke-linejoin="round"/>
    <rect x="8" y="30" width="48" height="24" rx="3" fill="#c68a4c" stroke="#4a2c12" stroke-width="3"/>
    <path d="M14 18 V54 M50 18 V54" stroke="#7a4a22" stroke-width="6"/>
    <rect x="8" y="27" width="48" height="6" fill="#7a4a22" stroke="#4a2c12" stroke-width="2"/>
    <rect x="26" y="26" width="12" height="14" rx="2" fill="#7a4a22" stroke="#4a2c12" stroke-width="2"/>
    <circle cx="32" cy="33" r="2" fill="#4a2c12"/></svg>`,
  chest_medium: `<svg viewBox="0 0 64 64">
    <path d="M8 30 C8 12 56 12 56 30 Z" fill="#b5703a" stroke="#4a2c12" stroke-width="3" stroke-linejoin="round"/>
    <rect x="8" y="30" width="48" height="24" rx="3" fill="#b5703a" stroke="#4a2c12" stroke-width="3"/>
    <path d="M14 18 V54 M50 18 V54" stroke="#c9ccd6" stroke-width="6"/>
    <rect x="8" y="27" width="48" height="6" fill="#c9ccd6" stroke="#4a2c12" stroke-width="2"/>
    <rect x="26" y="26" width="12" height="14" rx="2" fill="#c9ccd6" stroke="#4a2c12" stroke-width="2"/>
    <circle cx="32" cy="33" r="2" fill="#4a2c12"/></svg>`,
  chest_large: `<svg viewBox="0 0 64 64">
    <path d="M8 30 C8 12 56 12 56 30 Z" fill="#a0522d" stroke="#4a2c12" stroke-width="3" stroke-linejoin="round"/>
    <rect x="8" y="30" width="48" height="24" rx="3" fill="#a0522d" stroke="#4a2c12" stroke-width="3"/>
    <path d="M14 18 V54 M50 18 V54" stroke="#ffc93c" stroke-width="6"/>
    <rect x="8" y="27" width="48" height="6" fill="#ffc93c" stroke="#4a2c12" stroke-width="2"/>
    <rect x="26" y="26" width="12" height="14" rx="2" fill="#ffc93c" stroke="#4a2c12" stroke-width="2"/>
    <circle cx="32" cy="33" r="2" fill="#4a2c12"/></svg>`,
};

// Fill every [data-icon] element inside root with its SVG
function applyIcons(root) {
  root.querySelectorAll('[data-icon]').forEach(el => {
    el.innerHTML = ICONS[el.dataset.icon];
  });
}
