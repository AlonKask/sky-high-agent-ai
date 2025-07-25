import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ErrorBoundary from "@/components/ErrorBoundary";
import { AppSidebar } from "@/components/AppSidebar";
import { AIAssistantChat } from "@/components/AIAssistantChat";
import AgentProfile from "@/components/AgentProfile";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useState, Suspense, useEffect, lazy } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { SEOManager } from "@/utils/seo";
import { PerformanceMonitor } from "@/utils/performance";

// Lazy load pages for better performance
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Analytics = lazy(() => import("./pages/Analytics"));
const NotFound = lazy(() => import("./pages/NotFound"));
const BookingDetail = lazy(() => import("./pages/BookingDetail"));
const RequestDetail = lazy(() => import("./pages/RequestDetail"));
const Requests = lazy(() => import("./pages/Requests"));
const ClientProfile = lazy(() => import("./pages/ClientProfile"));
const Clients = lazy(() => import("./pages/Clients"));
const Calendar = lazy(() => import("./pages/Calendar"));
const Bookings = lazy(() => import("./pages/Bookings"));
const Emails = lazy(() => import("./pages/Emails"));
const Messages = lazy(() => import("./pages/Messages"));
const AgentStatistics = lazy(() => import("./pages/AgentStatistics"));
const ViewOption = lazy(() => import("./pages/ViewOption"));
const OptionsReview = lazy(() => import("./pages/OptionsReview"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry on auth errors
        if (error?.message?.includes('JWT') || error?.message?.includes('auth')) {
          return false;
        }
        return failureCount < 3;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime)
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    },
    mutations: {
      retry: false,
    },
  },
});

const App = () => {
  const [showAIChat, setShowAIChat] = useState(false);
  const [isAIChatMinimized, setIsAIChatMinimized] = useState(false);

  useEffect(() => {
    // Initialize SEO and performance monitoring
    PerformanceMonitor.mark('app-init');
    
    // Set default SEO configuration
    SEOManager.addStructuredData('softwareApplication', {
      "name": "Travel Agent Pro",
      "applicationCategory": "BusinessApplication",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      }
    });

    // Performance measurement
    const handleLoad = () => {
      PerformanceMonitor.measure('app-load-time', 'app-init');
    };

    if (document.readyState === 'complete') {
      handleLoad();
    } else {
      window.addEventListener('load', handleLoad);
      return () => window.removeEventListener('load', handleLoad);
    }
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
            <SidebarProvider>
              <div className="min-h-screen flex w-full overflow-hidden">
                <AppSidebar />
                
                <div className="flex-1 flex flex-col relative min-w-0">
                  {/* Header with sidebar trigger */}
                  <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shrink-0">
                      <div className="w-full px-4 flex h-14 items-center overflow-hidden">
                        <div className="flex flex-1 items-center justify-end min-w-0">
                          <AgentProfile />
                        </div>
                      </div>
                  </header>

                  {/* Main content */}
                  <main className="flex-1 overflow-auto min-h-0">
                    <Suspense fallback={
                      <div className="flex items-center justify-center h-96">
                        <LoadingSpinner size="lg" />
                      </div>
                    }>
                      <Routes>
                        <Route path="/auth" element={<Auth />} />
                        <Route path="/" element={<Index />} />
                        <Route path="/requests" element={<Requests />} />
                        <Route path="/clients" element={<Clients />} />
                        <Route path="/bookings" element={<Bookings />} />
                        <Route path="/emails" element={<Emails />} />
                        <Route path="/messages" element={<Messages />} />
                        <Route path="/calendar" element={<Calendar />} />
                        <Route path="/analytics/:type" element={<Analytics />} />
                        <Route path="/booking/:bookingId" element={<BookingDetail />} />
                        <Route path="/request/:requestId" element={<RequestDetail />} />
                        <Route path="/client/:clientId" element={<ClientProfile />} />
                        <Route path="/agent-statistics" element={<AgentStatistics />} />
                        <Route path="/option/:optionId" element={<ViewOption />} />
                        <Route path="/review-options/:clientToken" element={<OptionsReview />} />
                        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Suspense>
                  </main>

                  {/* Global AI Assistant - Always visible on all pages */}
                  {showAIChat && (
                    <AIAssistantChat
                      isMinimized={isAIChatMinimized}
                      onToggleMinimize={() => setIsAIChatMinimized(!isAIChatMinimized)}
                      onClose={() => setShowAIChat(false)}
                      initialContext="Global AI Assistant - I have access to your complete business context, client relationships, and sales pipeline."
                    />
                  )}

                  {/* Floating AI Assistant Button */}
                  {!showAIChat && (
                    <Button
                      onClick={() => setShowAIChat(true)}
                      className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 z-50 bg-primary hover:bg-primary/90"
                      size="icon"
                    >
                      <MessageSquare className="h-6 w-6" />
                    </Button>
                  )}
                </div>
              </div>
            </SidebarProvider>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
