"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/lib/auth-context";
import { FacilityProvider } from "@/hooks/use-facilities";
import { OnboardingGate } from "@/components/onboarding/onboarding-gate";
import { useSessionTimeout } from "@/hooks/use-session-timeout";

function SessionTimeoutManager() {
  useSessionTimeout(); // 1 hour inactivity timeout
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000, // 30 seconds
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <FacilityProvider>
          <SessionTimeoutManager />
          <OnboardingGate>
            {children}
          </OnboardingGate>
        </FacilityProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
