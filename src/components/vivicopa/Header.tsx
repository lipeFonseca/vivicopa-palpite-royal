import { LogOut, Menu, Trophy, UserRound } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { readSiteTheme } from "@/lib/siteTheme";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const LOGO_URL_KEY = "vivicopa:logo-url";
const LOGO_HEADER_SIZE_KEY = "vivicopa:logo-header-size";
const HEADER_BANNER_KEY = "vivicopa:header-banner-url";

type HeaderProps = {
  navigation: ReactNode;
  mobileNavContent?: (close: () => void) => ReactNode;
  mobileCenter?: ReactNode;
  actions?: ReactNode;
  username: string;
  role: "admin" | "user";
  onLogout: () => void | Promise<void>;
};

export function Header({
  navigation,
  mobileNavContent,
  mobileCenter,
  actions,
  username,
  role,
  onLogout,
}: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState(() =>
    typeof window !== "undefined" ? (localStorage.getItem(LOGO_URL_KEY) ?? "") : "",
  );
  const [logoHeaderSize, setLogoHeaderSize] = useState(() =>
    typeof window !== "undefined" ? Number(localStorage.getItem(LOGO_HEADER_SIZE_KEY) || 58) : 58,
  );
  const [bannerUrl, setBannerUrl] = useState(() =>
    typeof window !== "undefined" ? (localStorage.getItem(HEADER_BANNER_KEY) ?? "") : "",
  );
  const [theme, setTheme] = useState(readSiteTheme);

  useEffect(() => {
    const syncBrand = () => {
      setLogoUrl(localStorage.getItem(LOGO_URL_KEY) ?? "");
      setLogoHeaderSize(Number(localStorage.getItem(LOGO_HEADER_SIZE_KEY) || 58));
      setBannerUrl(localStorage.getItem(HEADER_BANNER_KEY) ?? "");
    };
    const syncTheme = () => setTheme(readSiteTheme());
    window.addEventListener("vivicopa:logo-changed", syncBrand);
    window.addEventListener("vivicopa:theme-changed", syncTheme);
    return () => {
      window.removeEventListener("vivicopa:logo-changed", syncBrand);
      window.removeEventListener("vivicopa:theme-changed", syncTheme);
    };
  }, []);

  const hasBanner = Boolean(bannerUrl);

  return (
    <header
      className="site-header relative z-40 border-b border-black/20"
      style={
        hasBanner
          ? {
              backgroundImage: "url(" + bannerUrl + ")",
              backgroundPosition: "center",
              backgroundSize: "cover",
            }
          : undefined
      }
    >
      {hasBanner && <div className="absolute inset-0 bg-[var(--site-surface)]/90" />}
      <div className="site-header-inner relative grid min-h-[90px] w-full items-center gap-x-3 px-5 sm:px-8 lg:px-10">
        <div className="site-brand flex min-w-0 flex-1 items-center gap-4">
          <div className="site-brand-mark flex shrink-0 items-center justify-center bg-brand text-[var(--site-surface)]">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={"Logo " + theme.title}
                style={{ maxHeight: logoHeaderSize, maxWidth: Math.max(72, logoHeaderSize * 1.45) }}
                className="h-auto w-auto object-contain"
              />
            ) : (
              <div className="px-3 py-2 text-center">
                <Trophy className="mx-auto mb-1 h-5 w-5" />
                <span className="site-display block max-w-24 text-xl font-black uppercase leading-[0.82]">
                  {theme.title}
                </span>
              </div>
            )}
          </div>
          {mobileCenter && <div className="flex-1">{mobileCenter}</div>}
        </div>

        <div className="site-header-navigation min-w-0 overflow-x-auto overflow-y-hidden pl-2 lg:pl-4">
          <div className="hidden sm:block">{navigation}</div>
        </div>

        <div className="site-user-wrap flex items-center justify-end gap-3">
          {actions}
          {mobileNavContent && (
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  aria-label="Abrir menu"
                  className="flex sm:hidden h-8 w-8 shrink-0 items-center justify-center rounded-md text-brand/70 transition hover:text-brand hover:bg-brand/10"
                >
                  <Menu className="h-[1.15rem] w-[1.15rem]" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                {mobileNavContent(() => setMobileOpen(false))}
              </SheetContent>
            </Sheet>
          )}
          <button
            type="button"
            onClick={onLogout}
            className="site-user-button group flex items-center gap-2 text-left"
            aria-label={"Sair da conta de " + username}
            title={"Sair da conta de " + username}
          >
            <span className="site-user-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-brand text-brand transition group-hover:bg-brand group-hover:text-white">
              <UserRound className="h-6 w-6" />
            </span>
            <span className="hidden max-w-24 leading-tight 2xl:block">
              <span className="block truncate text-[11px] font-black uppercase text-brand-dark">
                {username}
              </span>
              <span className="flex items-center gap-1 text-[9px] font-bold uppercase text-foreground/55">
                {role === "admin" ? "Admin" : "Conta"} <LogOut className="h-2.5 w-2.5" />
              </span>
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
