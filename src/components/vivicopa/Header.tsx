import { Trophy } from "lucide-react";
import { useEffect, useState } from "react";

const LOGO_URL_KEY = "vivicopa:logo-url";
const LOGO_HEADER_SIZE_KEY = "vivicopa:logo-header-size";

export function Header() {
  const [logoUrl, setLogoUrl] = useState(() =>
    typeof window !== "undefined" ? (localStorage.getItem(LOGO_URL_KEY) ?? "") : "",
  );
  const [logoHeaderSize, setLogoHeaderSize] = useState(() =>
    typeof window !== "undefined" ? Number(localStorage.getItem(LOGO_HEADER_SIZE_KEY) || 36) : 36,
  );

  useEffect(() => {
    const sync = () => {
      setLogoUrl(localStorage.getItem(LOGO_URL_KEY) ?? "");
      setLogoHeaderSize(Number(localStorage.getItem(LOGO_HEADER_SIZE_KEY) || 36));
    };
    window.addEventListener("vivicopa:logo-changed", sync);
    return () => window.removeEventListener("vivicopa:logo-changed", sync);
  }, []);

  return (
    <header className="relative sticky top-0 z-40 border-b border-border bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className="hidden sm:block absolute right-4 top-2 text-[11px] font-semibold uppercase tracking-widest text-brand/70">
        Copa do Mundo FIFA 2026
      </div>
      <div className="mx-auto flex max-w-6xl items-center px-4 py-3">
        <div className="flex items-center" style={{ gap: Math.round((logoHeaderSize / 36) * 8) }}>
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Logo Vivicopa"
              style={{ width: logoHeaderSize, height: logoHeaderSize }}
              className="rounded-xl object-contain"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-brand">
              <Trophy className="h-5 w-5" />
            </div>
          )}
          <div className="leading-tight">
            <div className="font-bold text-brand-dark" style={{ fontSize: Math.round((logoHeaderSize / 36) * 18) }}>Vivicopa</div>
            <div className="hidden text-muted-foreground sm:block" style={{ fontSize: Math.round((logoHeaderSize / 36) * 12) }}>
              Palpites, resenhas e emoção em cada jogo.
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
