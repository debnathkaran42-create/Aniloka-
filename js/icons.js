/* =========================================================
   ANILOKA — CUSTOM ICON SET
   -----------------------------------------------------------
   No emojis anywhere in the app. Every icon below is a plain
   inline SVG (currentColor stroke/fill) so it always matches
   the current text color and theme (gold or premium purple).
   Usage: icon("home", 20)  ->  returns an <svg> string
   ========================================================= */

const ICONS = {
  home: `<path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v9a1 1 0 0 0 1 1h3v-6h4v6h3a1 1 0 0 0 1-1v-9"/>`,
  search: `<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>`,
  library: `<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>`,
  premium: `<path d="M12 2.5 14.9 8.6 21.5 9.5 16.8 14 18 20.6 12 17.3 6 20.6 7.2 14 2.5 9.5 9.1 8.6z"/>`,
  profile: `<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7"/>`,
  bookmark: `<path d="M6 3h12v18l-6-4.5L6 21z"/>`,
  bookmarkFilled: `<path d="M6 3h12v18l-6-4.5L6 21z" fill="currentColor"/>`,
  lock: `<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>`,
  plus: `<path d="M12 5v14M5 12h14"/>`,
  trash: `<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/>`,
  edit: `<path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17z"/>`,
  image: `<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="m21 16-5-5-9 9"/>`,
  close: `<path d="M5 5l14 14M19 5 5 19"/>`,
  check: `<path d="M4 12.5 9.5 18 20 6"/>`,
  upload: `<path d="M12 16V4M6.5 9.5 12 4l5.5 5.5"/><path d="M4 20h16"/>`,
  cart: `<circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/><path d="M2.5 3h2.6l2.2 12.2h9.9l1.8-8.4H6.2"/>`,
  eye: `<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>`,
  settings: `<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>`,
  logout: `<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>`,
  arrowLeft: `<path d="m15 18-6-6 6-6"/>`,
  arrowRight: `<path d="m9 18 6-6-6-6"/>`,
  fullscreen: `<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>`,
  moon: `<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/>`,
  sun: `<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>`,
  zoom: `<circle cx="10" cy="10" r="7"/><path d="m21 21-4.3-4.3"/><path d="M7 10h6"/>`,
  brightness: `<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M4.2 4.2l1.5 1.5M18.3 18.3l1.5 1.5M3 12h2M19 12h2M4.2 19.8l1.5-1.5M18.3 5.7l1.5-1.5"/>`,
  share: `<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5 15.4 17.5M15.4 6.5 8.6 10.5"/>`,
  heart: `<path d="M12 20.5S3.5 14.9 3.5 8.8A4.8 4.8 0 0 1 12 5.9a4.8 4.8 0 0 1 8.5 2.9c0 6.1-8.5 11.7-8.5 11.7z"/>`,
  heartFilled: `<path d="M12 20.5S3.5 14.9 3.5 8.8A4.8 4.8 0 0 1 12 5.9a4.8 4.8 0 0 1 8.5 2.9c0 6.1-8.5 11.7-8.5 11.7z" fill="currentColor"/>`,
  menu: `<path d="M3 12h18M3 6h18M3 18h18"/>`,
  chart: `<path d="M4 20V10M11 20V4M18 20v-7"/>`,
  megaphone: `<path d="M3 10v4a1 1 0 0 0 1 1h2l7 4V5L6 9H4a1 1 0 0 0-1 1z"/><path d="M18 8a5 5 0 0 1 0 8"/>`,
  users: `<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.6 2.7-6 6-6s6 2.4 6 6"/><circle cx="17.5" cy="9" r="2.6"/><path d="M15.5 14.2c2.5.4 4.5 2.4 4.5 5.8"/>`,
  film: `<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>`,
  gauge: `<path d="M4 15a8 8 0 1 1 16 0"/><path d="M12 15l4-5"/><path d="M12 15a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>`,
  wrench: `<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.8 2.8-2-2z"/>`,
  book: `<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H12v16H5.5A1.5 1.5 0 0 1 4 18.5z"/><path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H12v16h6.5a1.5 1.5 0 0 0 1.5-1.5z"/>`,
  praying: `<path d="M12 3v6"/><path d="M8 21c0-4 1.8-6 4-6s4 2 4 6"/><path d="M12 9c-1.5 1.5-2 3-2 5M12 9c1.5 1.5 2 3 2 5"/>`,
  rocket: `<path d="M12 2c3 2 5 6 5 10 0 2-1 4-2 5l-3-2-3 2c-1-1-2-3-2-5 0-4 2-8 5-10z"/><path d="M9 17l-2 4M15 17l2 4"/>`,
  star: `<path d="M12 2.5 14.9 8.6 21.5 9.5 16.8 14 18 20.6 12 17.3 6 20.6 7.2 14 2.5 9.5 9.1 8.6z"/>`,
  unlock: `<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/>`,
  noAds: `<circle cx="12" cy="12" r="9"/><path d="M6 6l12 12"/>`,
  palette: `<path d="M12 3a9 9 0 1 0 0 18c1.2 0 2-1 2-2 0-.6-.2-1-.5-1.4-.3-.4-.5-.8-.5-1.3 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4c0-4.4-4-7.5-9-7.5z"/><circle cx="7.5" cy="12" r="1"/><circle cx="9.5" cy="8" r="1"/><circle cx="14.5" cy="8" r="1"/>`,
  zap: `<path d="M13 2 4 14h6l-1 8 9-12h-6z"/>`
};

/** Returns an inline <svg> string for the given icon name. */
function icon(name, size = 18, strokeWidth = 2) {
  const body = ICONS[name] || ICONS.star;
  const isFilled = body.includes('fill="currentColor"');
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" class="ico ico-${name}">${body}</svg>`;
}

/** Replaces every <span data-icon="name" data-size="18"> placeholder in the DOM with real SVG. */
function hydrateIcons(container) {
  (container || document).querySelectorAll("[data-icon]").forEach(el => {
    el.innerHTML = icon(el.dataset.icon, parseInt(el.dataset.size || "18", 10), parseInt(el.dataset.stroke || "2", 10));
  });
}
document.addEventListener("DOMContentLoaded", () => hydrateIcons());
