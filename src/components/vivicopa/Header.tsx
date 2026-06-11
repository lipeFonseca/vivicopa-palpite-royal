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

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className="mx-auto flex max-w-6xl items-center px-4 py-3">
        <div
          className="relative flex items-center overflow-hidden"
          style={{
            gap: Math.round(scale * 8),
            ...(bannerUrl
              ? {
                  backgroundImage: `url(${bannerUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  borderRadius: 12,
                  padding: `${Math.round(scale * 8)}px ${Math.round(scale * 12)}px`,
                }
              : {}),
          }}
        >
          {bannerUrl && (
            <div
              className="pointer-events-none absolute inset-0"
              style={{ background: "rgba(0,0,0,0.30)", borderRadius: 12 }}
            />
          )}
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Logo Vivicopa"
              style={{ width: logoHeaderSize, height: logoHeaderSize }}
              className="relative z-10 rounded-xl object-contain"
            />
          ) : (
            <div className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-brand">
              <Trophy className="h-5 w-5" />
            </div>
          )}
          <div className="relative z-10 leading-tight">
            <div
              className="font-bold"
              style={{
                fontSize: Math.round(scale * 18),
                color: bannerUrl ? "#fff" : undefined,
              }}
            >
              Vivicopa
            </div>
            <div
              className="hidden sm:block"
              style={{
                fontSize: Math.round(scale * 12),
                color: bannerUrl ? "rgba(255,255,255,0.85)" : undefined,
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
