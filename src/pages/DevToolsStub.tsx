import { Link } from "react-router-dom";

export default function DevToolsStub() {
  return (
    <div
      role="alert"
      className="min-h-[60vh] flex items-center justify-center p-6"
    >
      <div className="max-w-md w-full text-center space-y-4">
        <h1 className="text-2xl font-semibold">Admin tools unavailable</h1>
        <p className="text-sm text-muted-foreground">
          The admin DevKit is excluded from this build for security reasons. Use
          a desktop browser on the production web app to access these tools.
        </p>
        <Link
          to="/"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Back to app
        </Link>
      </div>
    </div>
  );
}
