export const SITE_TITLE_KEY = "vivicopa:site-title";
export const SITE_SUBTITLE_KEY = "vivicopa:site-subtitle";
export const SITE_PRIMARY_KEY = "vivicopa:site-primary";
export const SITE_ACCENT_KEY = "vivicopa:site-accent";
export const SITE_SURFACE_KEY = "vivicopa:site-surface";
export const HOME_SECONDARY_IMAGE_KEY = "vivicopa:home-secondary-image";

export const DEFAULT_SITE_THEME = {
  title: "Vivicopa",
  subtitle: "Palpites, histórias e emoção em cada jogo.",
  primary: "#1f4d35",
  accent: "#c59a3a",
  surface: "#eee9dc",
};

export function readSiteTheme() {
  if (typeof window === "undefined") return DEFAULT_SITE_THEME;
  return {
    title: localStorage.getItem(SITE_TITLE_KEY) || DEFAULT_SITE_THEME.title,
    subtitle: localStorage.getItem(SITE_SUBTITLE_KEY) || DEFAULT_SITE_THEME.subtitle,
    primary: localStorage.getItem(SITE_PRIMARY_KEY) || DEFAULT_SITE_THEME.primary,
    accent: localStorage.getItem(SITE_ACCENT_KEY) || DEFAULT_SITE_THEME.accent,
    surface: localStorage.getItem(SITE_SURFACE_KEY) || DEFAULT_SITE_THEME.surface,
  };
}

export function applySiteTheme() {
  if (typeof document === "undefined") return;
  const theme = readSiteTheme();
  const root = document.documentElement;
  root.style.setProperty("--brand", theme.primary);
  root.style.setProperty("--brand-dark", theme.primary);
  root.style.setProperty("--brand-mid", theme.primary);
  root.style.setProperty("--brand-light", theme.surface);
  root.style.setProperty("--brand-soft", theme.surface);
  root.style.setProperty("--primary", theme.primary);
  root.style.setProperty("--ring", theme.primary);
  root.style.setProperty("--site-accent", theme.accent);
  root.style.setProperty("--site-surface", theme.surface);
  root.style.setProperty(
    "--gradient-brand",
    "linear-gradient(135deg, " + theme.primary + ", " + theme.primary + ")",
  );
  root.style.setProperty(
    "--gradient-hero",
    "linear-gradient(135deg, " + theme.primary + ", " + theme.primary + ")",
  );
  document.title = theme.title + " - Copa 2026";
}

export function storeSiteTheme(values: {
  title: string;
  subtitle: string;
  primary: string;
  accent: string;
  surface: string;
}) {
  localStorage.setItem(SITE_TITLE_KEY, values.title);
  localStorage.setItem(SITE_SUBTITLE_KEY, values.subtitle);
  localStorage.setItem(SITE_PRIMARY_KEY, values.primary);
  localStorage.setItem(SITE_ACCENT_KEY, values.accent);
  localStorage.setItem(SITE_SURFACE_KEY, values.surface);
  applySiteTheme();
  window.dispatchEvent(new CustomEvent("vivicopa:theme-changed"));
}
