import { KindeProvider, useKindeAuth } from "@kinde-oss/kinde-auth-react";

const KINDE_DOMAIN = "https://thewisecloud.kinde.com";
const KINDE_CLIENT_ID = "629174acb2874e6bbf53cd4a95497425";
const REDIRECT_URI = `${window.location.origin}/kinde-auth-test`;

function KindeAuthContent() {
  const { login, register, logout, user, isAuthenticated, isLoading } =
    useKindeAuth();

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-lg space-y-6">
        <h1 className="text-2xl font-bold text-foreground text-center">
          Kinde Auth Test
        </h1>
        <p className="text-sm text-muted-foreground text-center">
          Isolated test page — does not affect existing auth.
        </p>

        {isLoading ? (
          <p className="text-center text-muted-foreground">Loading…</p>
        ) : isAuthenticated ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-4 space-y-1 text-sm">
              <p>
                <span className="font-medium text-foreground">Name:</span>{" "}
                {user?.given_name} {user?.family_name}
              </p>
              <p>
                <span className="font-medium text-foreground">Email:</span>{" "}
                {user?.email}
              </p>
              <p>
                <span className="font-medium text-foreground">ID:</span>{" "}
                <code className="text-xs">{user?.id}</code>
              </p>
            </div>
            <button
              onClick={() => logout()}
              className="w-full rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:opacity-90 transition"
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={() => login()}
              className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
            >
              Login
            </button>
            <button
              onClick={() => register()}
              className="flex-1 rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:opacity-90 transition"
            >
              Register
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function KindeAuthTestPage() {
  return (
    <KindeProvider
      clientId={KINDE_CLIENT_ID}
      domain={KINDE_DOMAIN}
      redirectUri={REDIRECT_URI}
      logoutUri={REDIRECT_URI}
    >
      <KindeAuthContent />
    </KindeProvider>
  );
}
