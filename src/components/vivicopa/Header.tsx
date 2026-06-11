import { Trophy } from "lucide-react";
import { useEffect, useState } from "react";

const LOGO_URL_KEY = "vivicopa:logo-url";
const LOGO_HEADER_SIZE_KEY = "vivicopa:logo-header-size";
const HEADER_BANNER_KEY = "vivicopa:header-banner-url";

export function Header() {
  const [logoUrl, setLogoUrl] = useState(() =>
    typeof window !== "undefined" ? (localStorage.getItem(LOGO_URL_KEY) ?? "") : "",
  );
  const [logoHeaderSize, setLogoHeaderSize] = useState(() =>
    typeof window !== "undefined" ? Number(localStorage.getItem(LOGO_HEADER_SIZE_KEY) || 36) : 36,
  );
  const [bannerUrl, setBannerUrl] = useState(() =>
    typeof window !== "undefined" ? (localStorage.getItem(HEADER_BANNER_KEY) ?? "") : "",
  );

  useEffect(() => {
    const sync = () => {
      setLogoUrl(localStorage.getItem(LOGO_URL_KEY) ?? "");
      setLogoHeaderSize(Number(localStorage.getItem(LOGO_HEADER_SIZE_KEY) || 36));
      setBannerUrl(localStorage.getItem(HEADER_BANNER_KEY) ?? "");
    };
    window.addEventListener("vivicopa:logo-changed", sync);
    return () => window.removeEventListener("vivicopa:logo-changed", sync);
  }, []);

  const scale = logoHeaderSize / 36;
  const hasBanner = Boolean(bannerUrl);

  return (
    <header
      className="relative sticky top-0 z-40 border-b border-border"
      style={
        hasBanner
          ? { backgroundImage: `url(${bannerUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
          : { background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)" }
      }
    >
      {hasBanner && (
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(135deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.25) 100%)" }}
        />
      )}

      <div className="relative mx-auto flex max-w-6xl items-center px-4 py-3">
        <div className="flex items-center" style={{ gap: Math.round(scale * 8) }}>
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Logo Vivicopa"
              style={{ width: logoHeaderSize, height: logoHeaderSize }}
              className="rounded-xl object-contain drop-shadow-md"
            />
          ) : (
            <div
              className="flex shrink-0 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-brand"
              style={{ width: Math.round(scale * 36), height: Math.round(scale * 36) }}
            >
              <Trophy style={{ width: Math.round(scale * 20), height: Math.round(scale * 20) }} />
            </div>
          )}

          <div className="leading-tight">
            <div
              className="font-bold"
              style={{
                fontSize: Math.round(scale * 18),
                color: hasBanner ? "#fff" : "var(--color-brand-dark, #1e3a5f)",
                textShadow: hasBanner ? "0 1px 4px rgba(0,0,0,0.4)" : undefined,
              }}
            >
              Vivicopa
            </div>
            <div
              className="hidden sm:block"
              style={{
                fontSize: Math.round(scale * 12),
                color: hasBanner ? "rgba(255,255,255,0.85)" : "var(--color-muted-foreground, #6b7280)",
                textShadow: hasBanner ? "0 1px 3px rgba(0,0,0,0.35)" : undefined,
              }}
            >
              Palpites, resenhas e emoção em cada jogo.
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
