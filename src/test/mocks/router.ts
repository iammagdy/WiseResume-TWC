import { vi } from "vitest";

// Mock react-router-dom hooks used across pages and components.
// Tests that need real routing should wrap with MemoryRouter instead.
const mockNavigate = vi.fn();
const mockLocation = { pathname: "/", search: "", hash: "", state: null };
const mockParams: Record<string, string> = {};

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
    useParams: () => mockParams,
  };
});

export { mockNavigate, mockLocation, mockParams };
