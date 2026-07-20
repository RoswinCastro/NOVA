import {
  ClipboardList,
  FileText,
  Home,
  LogOut,
  Menu,
  Moon,
  Settings,
  Shield,
  Sun,
  User,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import logoInicio from "../imports/nova-removebg-preview-1.png";
import {
  AuthProvider,
  useAuth,
  type User as AuthUser,
} from "./components/AuthContext";
import { AjustesModule } from "./components/AjustesModule";
import { ArmasModule } from "./components/ArmasModule";
import { Login } from "./components/Login";
import { PersonalModule } from "./components/PersonalModule";
import { RegistroEntradaSalidaModule } from "./components/RegistroEntradaSalidaModule";
import { RegistroModule } from "./components/RegistroModule";

type SectionKey =
  | "inicio"
  | "armas"
  | "registro"
  | "historial"
  | "personal"
  | "configuracion";

const ACTIVE_SECTION_STORAGE_KEY = "nova-active-section";
const VALID_SECTION_KEYS: SectionKey[] = [
  "inicio",
  "armas",
  "registro",
  "historial",
  "personal",
  "configuracion",
];

function AuthenticatedApp({
  user,
  logout,
}: {
  user: AuthUser;
  logout: () => void;
}) {
  const userRole = user.role;
  const [activeSection, setActiveSection] = useState<SectionKey>(() => {
    const storedSection = window.localStorage.getItem(
      ACTIVE_SECTION_STORAGE_KEY,
    );

    return VALID_SECTION_KEYS.includes(storedSection as SectionKey)
      ? (storedSection as SectionKey)
      : "inicio";
  });
  const [barraLateralHorizontal, setBarraLateralHorizontal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileHeaderVisible, setIsMobileHeaderVisible] = useState(true);
  const contentScrollRef = useRef<HTMLDivElement | null>(null);
  const mobileMenuContainerRef = useRef<HTMLDivElement | null>(null);
  const [tema, setTema] = useState<"claro" | "oscuro">(() => {
    const storedTheme = window.localStorage.getItem("nova-theme");
    return storedTheme === "oscuro" ? "oscuro" : "claro";
  });
  const [tamanoLetra, setTamanoLetra] = useState(() => {
    const storedFontSize = window.localStorage.getItem("nova-font-size");
    if (!storedFontSize) {
      return "16";
    }

    const parsedFontSize = Number(storedFontSize);
    return Number.isFinite(parsedFontSize) &&
      parsedFontSize >= 12 &&
      parsedFontSize <= 20
      ? storedFontSize
      : "16";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", tema === "oscuro");
    root.style.setProperty("--font-size", `${tamanoLetra}px`);
    window.localStorage.setItem("nova-theme", tema);
    window.localStorage.setItem("nova-font-size", tamanoLetra);
  }, [tamanoLetra, tema]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [activeSection]);

  useEffect(() => {
    window.localStorage.setItem(ACTIVE_SECTION_STORAGE_KEY, activeSection);
  }, [activeSection]);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return;
    }

    const handlePointerOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (mobileMenuContainerRef.current?.contains(target)) {
        return;
      }

      setIsMobileMenuOpen(false);
    };

    document.addEventListener("mousedown", handlePointerOutside);
    document.addEventListener("touchstart", handlePointerOutside, {
      passive: true,
    });

    return () => {
      document.removeEventListener("mousedown", handlePointerOutside);
      document.removeEventListener("touchstart", handlePointerOutside);
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (typeof window === "undefined" || window.innerWidth >= 768) {
      setIsMobileHeaderVisible(true);
      return;
    }

    if (isMobileMenuOpen) {
      setIsMobileHeaderVisible(true);
      return;
    }

    let lastScrollY = Math.max(
      window.scrollY,
      document.documentElement.scrollTop,
    );

    const handleScroll = () => {
      const currentScrollY = Math.max(
        window.scrollY,
        document.documentElement.scrollTop,
      );

      if (currentScrollY <= 16) {
        setIsMobileHeaderVisible(true);
        lastScrollY = currentScrollY;
        return;
      }

      if (currentScrollY > lastScrollY + 6) {
        setIsMobileHeaderVisible(false);
      } else if (currentScrollY < lastScrollY - 6) {
        setIsMobileHeaderVisible(true);
      }

      lastScrollY = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isMobileMenuOpen]);

  const navItems = useMemo(() => {
    const baseItems: Array<{
      key: SectionKey;
      label: string;
      icon: typeof Home;
    }> = [{ key: "inicio", label: "Inicio", icon: Home }];

    if (userRole === "admin") {
      return [
        ...baseItems,
        { key: "armas", label: "Armas", icon: Shield },
        { key: "registro", label: "Registro", icon: ClipboardList },
        { key: "historial", label: "Historial", icon: FileText },
        { key: "personal", label: "Personal", icon: User },
        { key: "configuracion", label: "Ajustes", icon: Settings },
      ];
    }

    return [
      ...baseItems,
      { key: "registro", label: "Registro", icon: ClipboardList },
      { key: "historial", label: "Historial", icon: FileText },
      { key: "configuracion", label: "Ajustes", icon: Settings },
    ];
  }, [userRole]);

  useEffect(() => {
    if (!navItems.some(({ key }) => key === activeSection)) {
      setActiveSection("inicio");
    }
  }, [activeSection, navItems]);

  const shortcutItems = useMemo(
    () => navItems.filter(({ key }) => key !== "inicio"),
    [navItems],
  );
  const activeSectionLabel =
    navItems.find(({ key }) => key === activeSection)?.label ?? "Inicio";

  function handleSectionChange(section: SectionKey) {
    setActiveSection(section);
    setIsMobileMenuOpen(false);
  }

  function renderContent() {
    switch (activeSection) {
      case "inicio":
        return (
          <div className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center md:min-h-[calc(100vh-4rem)]">
            <img
              src={logoInicio}
              alt="Logo NOVA"
              className="h-auto w-[300px] object-contain"
            />
            <p className="mt-4 max-w-md text-center text-gray-600 dark:text-gray-300">
              Sistema de gestion de armas y personal
            </p>
            <div className="mt-8 grid w-full max-w-4xl grid-cols-2 gap-3 md:grid-cols-6">
              {shortcutItems.map(({ key, label, icon: Icon }, index) => (
                <button
                  key={key}
                  onClick={() => handleSectionChange(key)}
                  className={`group flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-4 text-center text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-blue-200 hover:bg-slate-50 hover:shadow-[0_16px_30px_rgba(15,23,42,0.12)] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-500 dark:hover:bg-slate-800 dark:hover:shadow-[0_16px_34px_rgba(15,23,42,0.35)] ${
                    shortcutItems.length === 3 && index === 2
                      ? "col-span-full md:col-span-2"
                      : shortcutItems.length === 5 && index === 3
                        ? "md:col-span-2 md:col-start-2"
                        : shortcutItems.length === 5 && index === 4
                          ? "col-span-full md:col-span-2 md:col-start-4"
                          : "md:col-span-2"
                  }`}
                >
                  <Icon
                    size={22}
                    className="transition-transform duration-200 group-hover:scale-110 group-hover:-translate-y-0.5"
                  />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        );
      case "armas":
        return <ArmasModule />;
      case "registro":
        return <RegistroEntradaSalidaModule />;
      case "historial":
        return <RegistroModule />;
      case "personal":
        return <PersonalModule />;
      case "configuracion":
        return (
          <AjustesModule
            barraLateralHorizontal={barraLateralHorizontal}
            setBarraLateralHorizontal={setBarraLateralHorizontal}
            tema={tema}
            setTema={setTema}
            tamanoLetra={tamanoLetra}
            setTamanoLetra={setTamanoLetra}
          />
        );
      default:
        return null;
    }
  }

  const getDesktopButtonClass = (section: SectionKey) =>
    `flex min-w-[84px] shrink-0 flex-col items-center justify-center gap-1 rounded-2xl px-3 py-3 text-center transition-all duration-200 md:w-16 md:gap-2 md:p-3 ${
      activeSection === section
        ? "bg-slate-100 text-slate-950 shadow-[0_12px_32px_rgba(15,23,42,0.18)] ring-1 ring-white/70 dark:bg-slate-800 dark:text-white dark:ring-slate-700"
        : "text-white/85 hover:-translate-y-1 hover:bg-white/12 hover:text-white hover:shadow-[0_12px_28px_rgba(37,99,235,0.18)]"
    }`;

  const getMobileButtonClass = (section: SectionKey) =>
    `flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors ${
      activeSection === section
        ? "bg-black text-white"
        : "text-slate-700 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800"
    }`;

  return (
    <div
      className={`app-shell ${tema === "oscuro" ? "dark" : "light"} relative min-h-screen w-full overflow-x-hidden ${
        barraLateralHorizontal ? "flex flex-col" : "flex flex-col md:flex-row"
      }`}
    >
      <div
        ref={mobileMenuContainerRef}
        className={`mobile-app-header fixed inset-x-0 top-0 z-40 border-b border-gray-200 bg-gray-50/95 shadow-sm backdrop-blur transition-transform duration-300 will-change-transform md:hidden dark:border-slate-800 dark:bg-slate-950/95 ${
          isMobileHeaderVisible ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-[0.16em] text-slate-900 dark:text-white">
              NOVA
            </span>
            <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-white/45">
              {activeSectionLabel}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                setTema((current) =>
                  current === "oscuro" ? "claro" : "oscuro",
                )
              }
              aria-label={
                tema === "oscuro"
                  ? "Cambiar a modo claro"
                  : "Cambiar a modo oscuro"
              }
              className="rounded-2xl border border-gray-200 bg-white p-3 text-slate-700 shadow-sm transition-colors hover:bg-gray-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              {tema === "oscuro" ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button
              onClick={() => setIsMobileMenuOpen((current) => !current)}
              aria-label={isMobileMenuOpen ? "Cerrar menu" : "Abrir menu"}
              className="rounded-2xl border border-gray-200 bg-white p-3 text-slate-700 shadow-sm transition-colors hover:bg-gray-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="mobile-app-menu absolute top-full right-3 z-50 mt-3 w-[min(18rem,calc(100vw-1.5rem))] rounded-3xl border border-black/10 bg-white p-3 shadow-[0_24px_60px_rgba(0,0,0,0.28)] dark:border-slate-700 dark:bg-slate-900">
            <div className="space-y-2">
              {navItems.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => handleSectionChange(key)}
                  className={getMobileButtonClass(key)}
                  title={label}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </button>
              ))}
              <button
                onClick={logout}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                title="Cerrar sesion"
              >
                <LogOut size={18} />
                <span>Salir</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <div
        className={`sticky top-0 z-30 hidden self-stretch border-r border-white/10 bg-black shadow-[16px_0_40px_rgba(0,0,0,0.2)] md:block ${
          barraLateralHorizontal ? "w-full px-3 py-3" : "w-20 px-2 py-6"
        }`}
        style={!barraLateralHorizontal ? { minHeight: "100vh" } : undefined}
      >
        <div
          className={`flex items-center gap-2 ${barraLateralHorizontal ? "w-full flex-wrap justify-center" : "w-full flex-col gap-6"}`}
        >
          {navItems.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => handleSectionChange(key)}
              className={getDesktopButtonClass(key)}
              title={label}
            >
              <Icon size={24} />
              <span className="text-xs">{label}</span>
            </button>
          ))}

          <div
            className={
              barraLateralHorizontal ? "flex-1" : "hidden md:flex md:flex-1"
            }
          ></div>

          <button
            onClick={logout}
            className="flex min-w-[84px] shrink-0 flex-col items-center justify-center gap-1 rounded-lg px-3 py-2 text-center text-white transition-colors hover:bg-red-600 md:w-16 md:gap-2 md:p-3"
            title="Cerrar sesion"
          >
            <LogOut size={24} />
            <span className="text-xs">Salir</span>
          </button>
        </div>
      </div>

      <div
        ref={contentScrollRef}
        className="relative z-10 min-w-0 flex-1 bg-gray-50/96 p-3 pt-[84px] transition-colors duration-200 sm:p-4 sm:pt-[88px] md:p-8 md:pt-8 dark:bg-slate-950/92"
      >
        <div className="mx-auto max-w-7xl">{renderContent()}</div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ContentApp />
    </AuthProvider>
  );
}

function ContentApp() {
  const { user, logout } = useAuth();

  if (!user) {
    return <Login />;
  }

  return (
    <AuthenticatedApp
      key={`${user.role}-${user.name}`}
      user={user}
      logout={logout}
    />
  );
}
