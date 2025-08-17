
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SimpleAuthProvider } from "@/hooks/useSimpleAuth";
import { SimpleAuthGuard } from "@/components/SimpleAuthGuard";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Layout } from "@/components/Layout";
import { Suspense, lazy } from "react";
import { LoadingFallback } from "@/components/LoadingFallback";


// Essential pages only
const Index = lazy(() => import("./pages/Index"));
const SimpleAuth = lazy(() => import("./pages/SimpleAuth"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const BasicEmails = lazy(() => import("./pages/BasicEmails"));
const BasicClients = lazy(() => import("./pages/BasicClients"));
const BasicRequests = lazy(() => import("./pages/BasicRequests"));
const BasicNewRequest = lazy(() => import("./pages/BasicNewRequest"));
const BasicSettings = lazy(() => import("./pages/BasicSettings"));
const Management = lazy(() => import("./pages/Management"));
const UnifiedQuoteBuilder = lazy(() => import("./pages/UnifiedQuoteBuilder"));
const UserManagement = lazy(() => import("./pages/UserManagement"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <SimpleAuthProvider>
            <ErrorBoundary>
                <Suspense fallback={<LoadingFallback />}>
                  <Routes>
                    {/* Public routes */}
                    <Route path="/auth" element={<SimpleAuth />} />
                    <Route path="/auth/callback" element={<AuthCallback />} />
                     
                    {/* Protected routes */}
                    <Route path="/" element={<SimpleAuthGuard><Layout><Index /></Layout></SimpleAuthGuard>} />
                    <Route path="/emails" element={<SimpleAuthGuard><Layout><BasicEmails /></Layout></SimpleAuthGuard>} />
                    <Route path="/clients" element={<SimpleAuthGuard><Layout><BasicClients /></Layout></SimpleAuthGuard>} />
                    <Route path="/requests" element={<SimpleAuthGuard><Layout><BasicRequests /></Layout></SimpleAuthGuard>} />
                     <Route path="/requests/new" element={<SimpleAuthGuard><Layout><BasicNewRequest /></Layout></SimpleAuthGuard>} />
                      <Route path="/management" element={<SimpleAuthGuard><Layout><Management /></Layout></SimpleAuthGuard>} />
                      <Route path="/quote-builder" element={<SimpleAuthGuard><Layout><UnifiedQuoteBuilder /></Layout></SimpleAuthGuard>} />
                      <Route path="/admin/users" element={<SimpleAuthGuard><Layout><UserManagement /></Layout></SimpleAuthGuard>} />
                      <Route path="/settings" element={<SimpleAuthGuard><Layout><BasicSettings /></Layout></SimpleAuthGuard>} />
                     
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
                <Toaster />
              </ErrorBoundary>
          </SimpleAuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}

export default App;
