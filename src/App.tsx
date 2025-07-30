
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { SecurityProvider } from "@/components/SecurityProvider";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Layout } from "@/components/Layout";
import Index from "./pages/Index";
import SearchResults from "./pages/SearchResults";
import PassengerInformation from "./pages/PassengerInformation";
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
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <SecurityProvider>
            <BrowserRouter>
              <ErrorBoundary>
                <Routes>
                  {/* Public routes */}
                  <Route path="/" element={<Index />} />
                  <Route path="/search-results" element={<SearchResults />} />
                  <Route path="/booking/passenger-info" element={<PassengerInformation />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/options/:token" element={<OptionsReview />} />
                  <Route path="/view-option/:token/:quoteId" element={<ViewOption />} />
                  
                  {/* Protected routes */}
                  <Route path="/emails" element={<Layout><Emails /></Layout>} />
                  <Route path="/clients" element={<Layout><Clients /></Layout>} />
                  <Route path="/clients/:id" element={<Layout><ClientProfile /></Layout>} />
                  <Route path="/bookings" element={<Layout><Bookings /></Layout>} />
                  <Route path="/bookings/:id" element={<Layout><BookingDetail /></Layout>} />
                  <Route path="/requests" element={<Layout><Requests /></Layout>} />
                  <Route path="/requests/:id" element={<Layout><RequestDetail /></Layout>} />
                  <Route path="/calendar" element={<Layout><Calendar /></Layout>} />
                  <Route path="/analytics" element={<Layout><Analytics /></Layout>} />
                  <Route path="/messages" element={<Layout><Messages /></Layout>} />
                  <Route path="/agent-statistics" element={<Layout><AgentStatistics /></Layout>} />
                  
                  <Route path="*" element={<NotFound />} />
                </Routes>
                <Toaster />
              </ErrorBoundary>
            </BrowserRouter>
          </SecurityProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
