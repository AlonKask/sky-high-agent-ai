
import { Toaster } from "@/components/ui/sonner";
import { Toaster as RadixToaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { SecurityProvider } from "@/components/SecurityProvider";
import { RoleViewProvider } from "@/contexts/RoleViewContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Layout } from "@/components/Layout";
import { AuthGuard } from "@/components/AuthGuard";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Emails from "./pages/Emails";
import Clients from "./pages/Clients";
import ClientProfile from "./pages/ClientProfile";
import Bookings from "./pages/Bookings";
import BookingDetail from "./pages/BookingDetail";
import Requests from "./pages/Requests";
import RequestDetail from "./pages/RequestDetail";
import Calendar from "./pages/Calendar";
import Analytics from "./pages/Analytics";
import Messages from "./pages/Messages";
import AgentStatistics from "./pages/AgentStatistics";
import OptionsRedirect from "./pages/OptionsRedirect";
import ViewOption from "./pages/ViewOption";
import BookOption from "./pages/BookOption";
import PublicRequest from "./pages/PublicRequest";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Users from "./pages/Users";
import { Teams } from "./pages/Teams";
import TeamDetail from "./pages/TeamDetail";
import UserProfile from "./pages/UserProfile";
import IATAManagement from "./pages/IATAManagement";
import NotFound from "./pages/NotFound";

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
                <Routes>
                  {/* Public routes */}
                  <Route path="/auth" element={<Auth />} />
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
                  
                  <Route path="*" element={<NotFound />} />
                </Routes>
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
