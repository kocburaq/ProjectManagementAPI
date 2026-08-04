import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';

import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { useTheme } from '@/hooks/useTheme';
import { AppRoutes } from '@/routes/AppRoutes';
import { ErrorBoundary } from '@/routes/ErrorBoundary';

/**
 * TanStack Query yapılandırması.
 *
 * 401 / 403 / 404 gibi "tekrar denemenin faydası olmayan" hatalarda yeniden deneme
 * yapılmaz; aksi halde oturum düştüğünde üç kez daha 401 alınır ve kullanıcıya
 * gereksiz gecikme yaşatılır.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (error instanceof AxiosError) {
          const status = error.response?.status;
          if (status && [400, 401, 403, 404, 409].includes(status)) return false;
        }
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});

/** Toast bildirimlerinin teması uygulama temasını takip eder. */
function ThemedToaster() {
  const { resolvedTheme } = useTheme();

  return (
    <Toaster
      theme={resolvedTheme}
      position="bottom-right"
      richColors
      closeButton
      toastOptions={{ duration: 4000 }}
    />
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            {/* AuthProvider, Router'ın İÇİNDE olmalı: 401 sonrası yönlendirmeyi
                React Router'ın kendi mekanizması yapsın, tam sayfa yenileme olmasın. */}
            <AuthProvider>
              <TooltipProvider delayDuration={200}>
                <AppRoutes />
                <ThemedToaster />
              </TooltipProvider>
            </AuthProvider>
          </BrowserRouter>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
