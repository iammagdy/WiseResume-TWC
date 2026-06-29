import React, { type ReactElement } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { LocaleProvider } from "@/i18n/LocaleProvider";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

interface AllProvidersProps {
  children: React.ReactNode;
  initialPath?: string;
}

function AllProviders({ children, initialPath = "/" }: AllProvidersProps) {
  const queryClient = makeQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <LocaleProvider initialLocale="en">
        <MemoryRouter initialEntries={[initialPath]}>
          {children}
          <Toaster />
        </MemoryRouter>
      </LocaleProvider>
    </QueryClientProvider>
  );
}

function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper"> & { initialPath?: string }
) {
  const { initialPath, ...rest } = options ?? {};
  return render(ui, {
    wrapper: ({ children }) => (
      <AllProviders initialPath={initialPath}>{children}</AllProviders>
    ),
    ...rest,
  });
}

export { AllProviders, renderWithProviders };
