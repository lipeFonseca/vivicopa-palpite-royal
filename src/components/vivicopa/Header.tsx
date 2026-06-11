import { Trophy } from "lucide-react";
import { useEffect, useState } from "react";

const LOGO_URL_KEY = "vivicopa:logo-url";

export function Header() {
  const [logoUrl, setLogoUrl] = useState(() =>
    typeof window !== "undefined" ? (localStorage.getItem(LOGO_URL_KEY) ?? "") : "",
  );

  useEffect(() => {
    const sync = () => setLogoUrl(localStorage.getItem(LOGO_URL_KEY) ?? "");
    window.addEventListener("vivicopa:logo-changed", sync);
    return () => window.removeEventListener("vivicopa:logo-changed", sync);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Logo Vivicopa"
              className="h-9 w-9 rounded-xl object-contain"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-brand">
              <Trophy className="h-5 w-5" />
            </div>
          )}
          <div className="leading-tight">
            <div className="text-lg font-bold text-brand-dark">Vivicopa</div>
            <div className="hidden text-xs text-muted-foreground sm:block">
              Palpites, resenhas e emoção em cada jogo.
            </div>
          </div>
        </div>
        <div className="hidden text-xs font-semibold text-brand sm:block">Copa do Mundo FIFA 2026</div>
      </div>
    </header>
  );
}
