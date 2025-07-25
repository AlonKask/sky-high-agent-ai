
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { SecurityProvider } from "@/components/SecurityProvider";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
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
                <SidebarProvider>
                  <div className="flex h-screen w-full">
                    <Routes>
                      <Route path="/auth" element={<Auth />} />
                      <Route path="/options/:token" element={<OptionsReview />} />
                      <Route path="/view-option/:token/:quoteId" element={<ViewOption />} />
                      <Route path="*" element={
                        <>
                          <AppSidebar />
                          <main className="flex-1 overflow-hidden">
                            <div className="h-full overflow-auto">
                              <Routes>
                                <Route path="/" element={<Index />} />
                                <Route path="/emails" element={<Emails />} />
                                <Route path="/clients" element={<Clients />} />
                                <Route path="/clients/:id" element={<ClientProfile />} />
                                <Route path="/bookings" element={<Bookings />} />
                                <Route path="/bookings/:id" element={<BookingDetail />} />
                                <Route path="/requests" element={<Requests />} />
                                <Route path="/requests/:id" element={<RequestDetail />} />
                                <Route path="/calendar" element={<Calendar />} />
                                <Route path="/analytics" element={<Analytics />} />
                                <Route path="/messages" element={<Messages />} />
                                <Route path="/agent-statistics" element={<AgentStatistics />} />
                                <Route path="*" element={<NotFound />} />
                              </Routes>
                            </div>
                          </main>
                        </>
                      } />
                    </Routes>
                  </div>
                </SidebarProvider>
              </ErrorBoundary>
            </BrowserRouter>
          </SecurityProvider>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
