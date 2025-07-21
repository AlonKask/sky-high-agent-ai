import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Navigation from "@/components/Navigation";
import Dashboard from "@/components/Dashboard";
import ClientManager from "@/components/ClientManager";
import RequestManager from "@/components/RequestManager";
import BookingManager from "@/components/BookingManager";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const [currentView, setCurrentView] = useState("dashboard");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  const renderCurrentView = () => {
    switch (currentView) {
      case "dashboard":
        return <Dashboard setCurrentView={setCurrentView} />;
      case "clients":
        return <ClientManager />;
      case "requests":
        return <RequestManager />;
      case "bookings":
        return <BookingManager />;
      default:
        return <Dashboard />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // This will redirect to auth page via useEffect
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <Navigation currentView={currentView} onViewChange={setCurrentView} />
        <main className="flex-1 p-6 md:p-8">
          <div className="flex justify-end mb-4">
            <Button variant="ghost" onClick={signOut} className="text-muted-foreground">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
          {renderCurrentView()}
        </main>
      </div>
    </div>
  );
};

export default Index;
