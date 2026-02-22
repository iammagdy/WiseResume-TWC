import { Navigate, useParams } from "react-router-dom";

/** Redirects /jobs/:id → /job/:id preserving the param */
export function RedirectJobRoute() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/job/${id}`} replace />;
}
