export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "ufc-theme";

const THEME_COLOR = {
  light: "#0b1324",
  dark: "#060a12",
} as const;

export function readStoredTheme(): Theme | null {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : null;
  } catch {
    return null;
  }
}

export function preferredTheme(): Theme {
  const stored = readStoredTheme();
  if (stored) return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.dataset.theme = theme;
  root.style.colorScheme = theme;

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", THEME_COLOR[theme]);
}

export function persistTheme(theme: Theme) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // localStorage can be unavailable in private/incognito contexts.
  }
  applyTheme(theme);
}

export function getThemeSnapshot(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function getServerThemeSnapshot(): Theme {
  return "light";
}

/**
 * Subscribe to theme changes from the toggle or from the OS (when the user
 * has not made an explicit choice yet).
 */
export function subscribeToTheme(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

  const query = window.matchMedia("(prefers-color-scheme: dark)");
  const onSystemChange = () => {
    if (readStoredTheme()) return;
    applyTheme(query.matches ? "dark" : "light");
    callback();
  };

  query.addEventListener("change", onSystemChange);

  return () => {
    observer.disconnect();
    query.removeEventListener("change", onSystemChange);
  };
}
