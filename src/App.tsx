
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { SecurityProvider } from "@/components/SecurityProvider";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import ErrorBoundary from "@/components/ErrorBoundary";
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
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/options/:token" element={<OptionsReview />} />
                  <Route path="/view-option/:token/:quoteId" element={<ViewOption />} />
                  
                  {/* Protected routes */}
                  <Route path="/" element={
                    <AuthGuard>
                      <SidebarProvider>
                        <div className="flex h-screen w-full">
                          <AppSidebar />
                          <main className="flex-1 overflow-hidden">
                            <div className="h-full overflow-auto">
                              <Index />
                            </div>
                          </main>
                        </div>
                      </SidebarProvider>
                    </AuthGuard>
                  } />
                  
                  <Route path="/emails" element={
                    <AuthGuard>
                      <SidebarProvider>
                        <div className="flex h-screen w-full">
                          <AppSidebar />
                          <main className="flex-1 overflow-hidden">
                            <div className="h-full overflow-auto">
                              <Emails />
                            </div>
                          </main>
                        </div>
                      </SidebarProvider>
                    </AuthGuard>
                  } />
                  
                  <Route path="/clients" element={
                    <AuthGuard>
                      <SidebarProvider>
                        <div className="flex h-screen w-full">
                          <AppSidebar />
                          <main className="flex-1 overflow-hidden">
                            <div className="h-full overflow-auto">
                              <Clients />
                            </div>
                          </main>
                        </div>
                      </SidebarProvider>
                    </AuthGuard>
                  } />
                  
                  <Route path="/clients/:id" element={
                    <AuthGuard>
                      <SidebarProvider>
                        <div className="flex h-screen w-full">
                          <AppSidebar />
                          <main className="flex-1 overflow-hidden">
                            <div className="h-full overflow-auto">
                              <ClientProfile />
                            </div>
                          </main>
                        </div>
                      </SidebarProvider>
                    </AuthGuard>
                  } />
                  
                  <Route path="/bookings" element={
                    <AuthGuard>
                      <SidebarProvider>
                        <div className="flex h-screen w-full">
                          <AppSidebar />
                          <main className="flex-1 overflow-hidden">
                            <div className="h-full overflow-auto">
                              <Bookings />
                            </div>
                          </main>
                        </div>
                      </SidebarProvider>
                    </AuthGuard>
                  } />
                  
                  <Route path="/bookings/:id" element={
                    <AuthGuard>
                      <SidebarProvider>
                        <div className="flex h-screen w-full">
                          <AppSidebar />
                          <main className="flex-1 overflow-hidden">
                            <div className="h-full overflow-auto">
                              <BookingDetail />
                            </div>
                          </main>
                        </div>
                      </SidebarProvider>
                    </AuthGuard>
                  } />
                  
                  <Route path="/requests" element={
                    <AuthGuard>
                      <SidebarProvider>
                        <div className="flex h-screen w-full">
                          <AppSidebar />
                          <main className="flex-1 overflow-hidden">
                            <div className="h-full overflow-auto">
                              <Requests />
                            </div>
                          </main>
                        </div>
                      </SidebarProvider>
                    </AuthGuard>
                  } />
                  
                  <Route path="/requests/:id" element={
                    <AuthGuard>
                      <SidebarProvider>
                        <div className="flex h-screen w-full">
                          <AppSidebar />
                          <main className="flex-1 overflow-hidden">
                            <div className="h-full overflow-auto">
                              <RequestDetail />
                            </div>
                          </main>
                        </div>
                      </SidebarProvider>
                    </AuthGuard>
                  } />
                  
                  <Route path="/calendar" element={
                    <AuthGuard>
                      <SidebarProvider>
                        <div className="flex h-screen w-full">
                          <AppSidebar />
                          <main className="flex-1 overflow-hidden">
                            <div className="h-full overflow-auto">
                              <Calendar />
                            </div>
                          </main>
                        </div>
                      </SidebarProvider>
                    </AuthGuard>
                  } />
                  
                  <Route path="/analytics" element={
                    <AuthGuard>
                      <SidebarProvider>
                        <div className="flex h-screen w-full">
                          <AppSidebar />
                          <main className="flex-1 overflow-hidden">
                            <div className="h-full overflow-auto">
                              <Analytics />
                            </div>
                          </main>
                        </div>
                      </SidebarProvider>
                    </AuthGuard>
                  } />
                  
                  <Route path="/messages" element={
                    <AuthGuard>
                      <SidebarProvider>
                        <div className="flex h-screen w-full">
                          <AppSidebar />
                          <main className="flex-1 overflow-hidden">
                            <div className="h-full overflow-auto">
                              <Messages />
                            </div>
                          </main>
                        </div>
                      </SidebarProvider>
                    </AuthGuard>
                  } />
                  
                  <Route path="/agent-statistics" element={
                    <AuthGuard>
                      <SidebarProvider>
                        <div className="flex h-screen w-full">
                          <AppSidebar />
                          <main className="flex-1 overflow-hidden">
                            <div className="h-full overflow-auto">
                              <AgentStatistics />
                            </div>
                          </main>
                        </div>
                      </SidebarProvider>
                    </AuthGuard>
                  } />
                  
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
