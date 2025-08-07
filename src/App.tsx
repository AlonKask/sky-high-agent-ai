
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
import OptionsReview from "./pages/OptionsReview";
import ViewOption from "./pages/ViewOption";
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
                  <Route path="/options/:token" element={<OptionsReview />} />
                  <Route path="/view-option/:token/:quoteId" element={<ViewOption />} />
                  <Route path="/public-request" element={<PublicRequest />} />
                  
                  {/* Protected routes */}
                  <Route path="/" element={<Layout><Index /></Layout>} />
                  <Route path="/emails" element={<Layout><Emails /></Layout>} />
                  <Route path="/clients" element={<Layout><Clients /></Layout>} />
                  <Route path="/clients/:id" element={<Layout><ClientProfile /></Layout>} />
                  <Route path="/bookings" element={<Layout><Bookings /></Layout>} />
                  <Route path="/bookings/:id" element={<Layout><BookingDetail /></Layout>} />
                  <Route path="/requests" element={<Layout><Requests /></Layout>} />
                  <Route path="/request/:id" element={<Layout><RequestDetail /></Layout>} />
                  <Route path="/calendar" element={<Layout><Calendar /></Layout>} />
                  <Route path="/analytics" element={<Layout><Analytics /></Layout>} />
                  <Route path="/messages" element={<Layout><Messages /></Layout>} />
                  <Route path="/agent-statistics" element={<Layout><AgentStatistics /></Layout>} />
                  <Route path="/reports" element={<Layout><Reports /></Layout>} />
                  <Route path="/settings" element={<Layout><Settings /></Layout>} />
            <Route path="/users" element={<Layout><Users /></Layout>} />
            <Route path="/teams" element={<Layout><Teams /></Layout>} />
            <Route path="/teams/:id" element={<Layout><TeamDetail /></Layout>} />
            <Route path="/users/:id" element={<Layout><UserProfile /></Layout>} />
            <Route path="/iata-management" element={<Layout><IATAManagement /></Layout>} />
                  
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
