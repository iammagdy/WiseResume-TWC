import { KindeProvider, useKindeAuth } from "@kinde-oss/kinde-auth-react";

const KINDE_DOMAIN = "https://thewisecloud.kinde.com";
const KINDE_CLIENT_ID = "629174acb2874e6bbf53cd4a95497425";
const REDIRECT_URI = `${window.location.origin}/kinde-auth-test`;

function KindeAuthContent() {
  const { login, register, logout, user } = useKindeAuth();

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Kinde Auth Test Page</h1>

        <div className="flex gap-3">
          <button onClick={() => register()} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Register</button>
          <button onClick={() => login()} className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground">Log In</button>
          <button onClick={() => logout()} className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground">Logout</button>
        </div>

        {user && (
          <div className="rounded-lg bg-muted p-4 space-y-1 text-sm text-foreground">
            <p><strong>ID:</strong> {user.id}</p>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Name:</strong> {user.givenName} {user.familyName}</p>
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
