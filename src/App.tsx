import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AppSidebar } from "@/components/AppSidebar";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Analytics from "./pages/Analytics";
import NotFound from "./pages/NotFound";
import BookingDetail from "./pages/BookingDetail";
import RequestDetail from "./pages/RequestDetail";
import Requests from "./pages/Requests";
import ClientProfile from "./pages/ClientProfile";
import Clients from "./pages/Clients";
import Calendar from "./pages/Calendar";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <SidebarProvider>
            <div className="min-h-screen flex w-full">
              <AppSidebar />
              
              <div className="flex-1 flex flex-col">
                {/* Header with sidebar trigger */}
                <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                  <div className="container flex h-14 items-center">
                    <SidebarTrigger className="mr-4" />
                    <div className="flex flex-1 items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <h2 className="text-lg font-semibold">Travel Management System</h2>
                      </div>
                    </div>
                  </div>
                </header>

                {/* Main content */}
                <main className="flex-1 overflow-auto">
                  <Routes>
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/" element={<Index />} />
                    <Route path="/requests" element={<Requests />} />
                    <Route path="/clients" element={<Clients />} />
                    <Route path="/calendar" element={<Calendar />} />
                    <Route path="/analytics/:type" element={<Analytics />} />
                    <Route path="/booking/:bookingId" element={<BookingDetail />} />
                    <Route path="/request/:requestId" element={<RequestDetail />} />
                    <Route path="/client/:clientId" element={<ClientProfile />} />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </main>
              </div>
            </div>
          </SidebarProvider>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
