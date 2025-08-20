
import { Toaster } from "@/components/ui/sonner";
import { Toaster as RadixToaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SimpleAuthProvider } from "@/hooks/useSimpleAuth";
import { RoleViewProvider } from "@/contexts/RoleViewContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Layout } from "@/components/Layout";
import { SimpleAuthGuard } from "@/components/SimpleAuthGuard";
import { Suspense, lazy } from "react";
import { LoadingFallback } from "@/components/LoadingFallback";
import SecurityInitializer from "@/components/SecurityInitializer";

// Lazy load pages for better performance
const Index = lazy(() => import("./pages/Index"));
const AuthOptimized = lazy(() => import("./pages/AuthOptimized"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const Emails = lazy(() => import("./pages/Emails"));
const Clients = lazy(() => import("./pages/Clients"));
const ClientProfile = lazy(() => import("./pages/ClientProfile"));
const Bookings = lazy(() => import("./pages/Bookings"));
const BookingDetail = lazy(() => import("./pages/BookingDetail"));
const Requests = lazy(() => import("./pages/Requests"));
const RequestDetail = lazy(() => import("./pages/RequestDetail"));
const NewRequest = lazy(() => import("./pages/NewRequest"));
const Calendar = lazy(() => import("./pages/Calendar"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Messages = lazy(() => import("./pages/Messages"));
const AgentStatistics = lazy(() => import("./pages/AgentStatistics"));
const OptionsRedirect = lazy(() => import("./pages/OptionsRedirect"));
const ViewOption = lazy(() => import("./pages/ViewOption"));
const BookOption = lazy(() => import("./pages/BookOption"));
const PublicRequest = lazy(() => import("./pages/PublicRequest"));
const Reports = lazy(() => import("./pages/Reports"));
const Settings = lazy(() => import("./pages/Settings"));
const Users = lazy(() => import("./pages/Users"));
const Teams = lazy(() => import("./pages/Teams").then(module => ({ default: module.Teams })));
const TeamDetail = lazy(() => import("./pages/TeamDetail"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const IATAManagement = lazy(() => import("./pages/IATAManagement"));
const Security = lazy(() => import("./pages/Security"));
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
      <SecurityInitializer />
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <SimpleAuthProvider>
            <RoleViewProvider>
              <ErrorBoundary>
                <Suspense fallback={<LoadingFallback />}>
                  <Routes>
                    {/* Public routes */}
                    <Route path="/auth" element={<AuthOptimized />} />
                    <Route path="/auth/callback" element={<AuthCallback />} />
                    <Route path="/options/:token" element={<OptionsRedirect />} />
                    <Route path="/view-option/:token" element={<ViewOption />} />
                    <Route path="/book/:token" element={<BookOption />} />
                    <Route path="/public-request" element={<PublicRequest />} />
                    
                     {/* Protected routes */}
                     <Route path="/" element={<SimpleAuthGuard><Layout><Index /></Layout></SimpleAuthGuard>} />
                     <Route path="/emails" element={<SimpleAuthGuard><Layout><Emails /></Layout></SimpleAuthGuard>} />
                     <Route path="/clients" element={<SimpleAuthGuard><Layout><Clients /></Layout></SimpleAuthGuard>} />
                     <Route path="/clients/:id" element={<SimpleAuthGuard><Layout><ClientProfile /></Layout></SimpleAuthGuard>} />
                     <Route path="/bookings" element={<SimpleAuthGuard><Layout><Bookings /></Layout></SimpleAuthGuard>} />
                     <Route path="/bookings/:id" element={<SimpleAuthGuard><Layout><BookingDetail /></Layout></SimpleAuthGuard>} />
                     <Route path="/requests" element={<SimpleAuthGuard><Layout><Requests /></Layout></SimpleAuthGuard>} />
                     <Route path="/requests/new" element={<SimpleAuthGuard><Layout><NewRequest /></Layout></SimpleAuthGuard>} />
                     <Route path="/request/:id" element={<SimpleAuthGuard><Layout><RequestDetail /></Layout></SimpleAuthGuard>} />
                     <Route path="/calendar" element={<SimpleAuthGuard><Layout><Calendar /></Layout></SimpleAuthGuard>} />
                     <Route path="/analytics" element={<SimpleAuthGuard><Layout><Analytics /></Layout></SimpleAuthGuard>} />
                     <Route path="/messages" element={<SimpleAuthGuard><Layout><Messages /></Layout></SimpleAuthGuard>} />
                     <Route path="/agent-statistics" element={<SimpleAuthGuard><Layout><AgentStatistics /></Layout></SimpleAuthGuard>} />
                     <Route path="/reports" element={<SimpleAuthGuard><Layout><Reports /></Layout></SimpleAuthGuard>} />
                     <Route path="/settings" element={<SimpleAuthGuard><Layout><Settings /></Layout></SimpleAuthGuard>} />
                <Route path="/users" element={<SimpleAuthGuard><Layout><Users /></Layout></SimpleAuthGuard>} />
                <Route path="/teams" element={<SimpleAuthGuard><Layout><Teams /></Layout></SimpleAuthGuard>} />
                <Route path="/teams/:id" element={<SimpleAuthGuard><Layout><TeamDetail /></Layout></SimpleAuthGuard>} />
                <Route path="/users/:id" element={<SimpleAuthGuard><Layout><UserProfile /></Layout></SimpleAuthGuard>} />
                <Route path="/iata-management" element={<SimpleAuthGuard><Layout><IATAManagement /></Layout></SimpleAuthGuard>} />
                <Route path="/security" element={<SimpleAuthGuard><Layout><Security /></Layout></SimpleAuthGuard>} />
                    
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
                <Toaster />
                <RadixToaster />
                </ErrorBoundary>
            </RoleViewProvider>
          </SimpleAuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}

export default App;
