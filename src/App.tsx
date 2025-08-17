
import { Toaster } from "@/components/ui/sonner";
import { Toaster as RadixToaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuthOptimized";
import { SecurityProvider } from "@/components/SecurityProvider";
import { RoleViewProvider } from "@/contexts/RoleViewContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Layout } from "@/components/Layout";
import { AuthGuard } from "@/components/AuthGuard";
import { Suspense, lazy } from "react";
import { LoadingFallback } from "@/components/LoadingFallback";

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
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <RoleViewProvider>
              <SecurityProvider>
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
                     <Route path="/" element={<AuthGuard><Layout><Index /></Layout></AuthGuard>} />
                     <Route path="/emails" element={<AuthGuard><Layout><Emails /></Layout></AuthGuard>} />
                     <Route path="/clients" element={<AuthGuard><Layout><Clients /></Layout></AuthGuard>} />
                     <Route path="/clients/:id" element={<AuthGuard><Layout><ClientProfile /></Layout></AuthGuard>} />
                     <Route path="/bookings" element={<AuthGuard><Layout><Bookings /></Layout></AuthGuard>} />
                     <Route path="/bookings/:id" element={<AuthGuard><Layout><BookingDetail /></Layout></AuthGuard>} />
                     <Route path="/requests" element={<AuthGuard><Layout><Requests /></Layout></AuthGuard>} />
                     <Route path="/requests/new" element={<AuthGuard><Layout><NewRequest /></Layout></AuthGuard>} />
                     <Route path="/request/:id" element={<AuthGuard><Layout><RequestDetail /></Layout></AuthGuard>} />
                     <Route path="/calendar" element={<AuthGuard><Layout><Calendar /></Layout></AuthGuard>} />
                     <Route path="/analytics" element={<AuthGuard><Layout><Analytics /></Layout></AuthGuard>} />
                     <Route path="/messages" element={<AuthGuard><Layout><Messages /></Layout></AuthGuard>} />
                     <Route path="/agent-statistics" element={<AuthGuard><Layout><AgentStatistics /></Layout></AuthGuard>} />
                     <Route path="/reports" element={<AuthGuard><Layout><Reports /></Layout></AuthGuard>} />
                     <Route path="/settings" element={<AuthGuard><Layout><Settings /></Layout></AuthGuard>} />
               <Route path="/users" element={<AuthGuard><Layout><Users /></Layout></AuthGuard>} />
               <Route path="/teams" element={<AuthGuard><Layout><Teams /></Layout></AuthGuard>} />
               <Route path="/teams/:id" element={<AuthGuard><Layout><TeamDetail /></Layout></AuthGuard>} />
               <Route path="/users/:id" element={<AuthGuard><Layout><UserProfile /></Layout></AuthGuard>} />
               <Route path="/iata-management" element={<AuthGuard><Layout><IATAManagement /></Layout></AuthGuard>} />
               <Route path="/security" element={<AuthGuard><Layout><Security /></Layout></AuthGuard>} />
                    
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
                <Toaster />
                <RadixToaster />
                </ErrorBoundary>
              </SecurityProvider>
            </RoleViewProvider>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}

export default App;
