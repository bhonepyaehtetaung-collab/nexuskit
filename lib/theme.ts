// Shared by the root layout (server) and the theme button (client).
export const THEME_KEY = "nk_theme";

/** Runs in <head> before the page paints, so a saved light/dark choice never flashes. */
export const themeScript = `try{var t=localStorage.getItem("${THEME_KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;
