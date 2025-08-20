
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthGuard } from "./components/AuthGuard";
import { Layout } from "./components/Layout";
import ErrorBoundary from "./components/ErrorBoundary";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Requests from "./pages/Requests";
import RequestDetail from "./pages/RequestDetail";
import Clients from "./pages/Clients";
import ClientProfile from "./pages/ClientProfile";
import Bookings from "./pages/Bookings";
import BookingDetail from "./pages/BookingDetail";
import Emails from "./pages/Emails";
import SimpleEmails from "./pages/SimpleEmails";
import Messages from "./pages/Messages";
import Analytics from "./pages/Analytics";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Users from "./pages/Users";
import UserProfile from "./pages/UserProfile";
import AgentStatistics from "./pages/AgentStatistics";
import Calendar from "./pages/Calendar";
import IATAManagement from "./pages/IATAManagement";
import PublicRequest from "./pages/PublicRequest";
import ViewOption from "./pages/ViewOption";
import OptionsReview from "./pages/OptionsReview";
import OptionsRedirect from "./pages/OptionsRedirect";
import BookOption from "./pages/BookOption";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ErrorBoundary>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/request" element={<PublicRequest />} />
            <Route path="/view-option/:token" element={<ViewOption />} />
            <Route path="/options/:token" element={<OptionsRedirect />} />
            <Route path="/review-options/:token" element={<OptionsReview />} />
            <Route path="/book-option/:token" element={<BookOption />} />
            <Route
              path="/*"
              element={
                <AuthGuard>
                  <Layout>
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/requests" element={<Requests />} />
                      <Route path="/requests/:id" element={<RequestDetail />} />
                      <Route path="/clients" element={<Clients />} />
                      <Route path="/client/:id" element={<ClientProfile />} />
                      <Route path="/bookings" element={<Bookings />} />
                      <Route path="/booking/:id" element={<BookingDetail />} />
                      <Route path="/emails" element={<Emails />} />
                      <Route path="/simple-emails" element={<SimpleEmails />} />
                      <Route path="/messages" element={<Messages />} />
                      <Route path="/analytics" element={<Analytics />} />
                      <Route path="/reports" element={<Reports />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/users" element={<Users />} />
                      <Route path="/user/:id" element={<UserProfile />} />
                      <Route path="/agent-statistics" element={<AgentStatistics />} />
                      <Route path="/calendar" element={<Calendar />} />
                      <Route path="/iata-management" element={<IATAManagement />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Layout>
                </AuthGuard>
              }
            />
          </Routes>
        </ErrorBoundary>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
