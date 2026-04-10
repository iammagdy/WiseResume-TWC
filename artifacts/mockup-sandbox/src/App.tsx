import { useEffect, useState, type ComponentType } from "react";

import { modules as discoveredModules } from "./.generated/mockup-components";

type ModuleMap = Record<string, () => Promise<Record<string, unknown>>>;

const NAMED_ROUTES: Record<string, string> = {
  "/midnight": "landing-variants/MidnightPro",
  "/clean": "landing-variants/CleanSlate",
  "/depth": "landing-variants/DepthField",
};

const VARIANTS = [
  { path: "/midnight", label: "A — Midnight Pro", sub: "Dark Glassmorphism", color: "#6366f1" },
  { path: "/clean",    label: "B — Clean Slate",  sub: "Minimal SaaS",       color: "#0ea5e9" },
  { path: "/depth",    label: "C — Depth Field",  sub: "3D Parallax",        color: "#a855f7" },
];

function _resolveComponent(
  mod: Record<string, unknown>,
  name: string,
): ComponentType | undefined {
  const fns = Object.values(mod).filter(
    (v) => typeof v === "function",
  ) as ComponentType[];
  return (
    (mod.default as ComponentType) ||
    (mod.Preview as ComponentType) ||
    (mod[name] as ComponentType) ||
    fns[fns.length - 1]
  );
}

function PreviewRenderer({
  componentPath,
  modules,
}: {
  componentPath: string;
  modules: ModuleMap;
}) {
  const [Component, setComponent] = useState<ComponentType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setComponent(null);
    setError(null);

    async function loadComponent(): Promise<void> {
      const key = `./components/mockups/${componentPath}.tsx`;
      const loader = modules[key];
      if (!loader) {
        setError(`No component found at ${componentPath}.tsx`);
        return;
      }

      try {
        const mod = await loader();
        if (cancelled) {
          return;
        }
        const name = componentPath.split("/").pop()!;
        const comp = _resolveComponent(mod, name);
        if (!comp) {
          setError(
            `No exported React component found in ${componentPath}.tsx\n\nMake sure the file has at least one exported function component.`,
          );
          return;
        }
        setComponent(() => comp);
      } catch (e) {
        if (cancelled) {
          return;
        }

        const message = e instanceof Error ? e.message : String(e);
        setError(`Failed to load preview.\n${message}`);
      }
    }

    void loadComponent();

    return () => {
      cancelled = true;
    };
  }, [componentPath, modules]);

  if (error) {
    return (
      <pre style={{ color: "red", padding: "2rem", fontFamily: "system-ui" }}>
        {error}
      </pre>
    );
  }

  if (!Component) return null;

  return <Component />;
}

function getBasePath(): string {
  return import.meta.env.BASE_URL.replace(/\/$/, "");
}

function ComparisonGallery() {
  const basePath = getBasePath();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f0f13",
        fontFamily: "system-ui, -apple-system, sans-serif",
        padding: "32px 24px",
      }}
    >
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: "#fff",
              marginBottom: 8,
              letterSpacing: "-0.5px",
            }}
          >
            WiseResume — Landing Page Variants
          </h1>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", marginBottom: 0 }}>
            Compare all three designs side by side. Click a label to open full view.
          </p>
        </div>

        <style>{`
          @media (max-width: 900px) { .cg-grid { grid-template-columns: 1fr 1fr !important; } }
          @media (max-width: 600px) { .cg-grid { grid-template-columns: 1fr !important; } }
        `}</style>
        <div
          className="cg-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 20,
            alignItems: "start",
          }}
        >
          {VARIANTS.map((v) => (
            <div key={v.path} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.05)",
                  border: `1px solid ${v.color}40`,
                }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: v.color,
                    flexShrink: 0,
                    boxShadow: `0 0 8px ${v.color}`,
                  }}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{v.label}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{v.sub}</div>
                </div>
                <a
                  href={`${basePath}${v.path}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    marginLeft: "auto",
                    fontSize: 11,
                    color: v.color,
                    textDecoration: "none",
                    fontWeight: 600,
                    padding: "4px 10px",
                    borderRadius: 6,
                    border: `1px solid ${v.color}50`,
                    background: `${v.color}10`,
                  }}
                >
                  Open ↗
                </a>
              </div>

              <div
                style={{
                  borderRadius: 12,
                  overflow: "hidden",
                  border: `1px solid ${v.color}25`,
                  boxShadow: `0 4px 24px rgba(0,0,0,0.4)`,
                  background: "#000",
                  height: 640,
                  position: "relative",
                }}
              >
                <iframe
                  src={`${basePath}${v.path}`}
                  title={v.label}
                  style={{
                    width: "200%",
                    height: "200%",
                    border: "none",
                    transform: "scale(0.5)",
                    transformOrigin: "0 0",
                    pointerEvents: "none",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function getLocalPath(): string {
  const basePath = getBasePath();
  const { pathname } = window.location;
  return basePath && pathname.startsWith(basePath)
    ? pathname.slice(basePath.length) || "/"
    : pathname;
}

function getPreviewPath(): string | null {
  const local = getLocalPath();
  const match = local.match(/^\/preview\/(.+)$/);
  return match ? match[1] : null;
}

function getNamedRoute(): string | null {
  const local = getLocalPath();
  return NAMED_ROUTES[local] ?? null;
}

function App() {
  const previewPath = getPreviewPath();
  if (previewPath) {
    return (
      <PreviewRenderer
        componentPath={previewPath}
        modules={discoveredModules}
      />
    );
  }

  const namedPath = getNamedRoute();
  if (namedPath) {
    return (
      <PreviewRenderer
        componentPath={namedPath}
        modules={discoveredModules}
      />
    );
  }

  return <ComparisonGallery />;
}

export default App;
