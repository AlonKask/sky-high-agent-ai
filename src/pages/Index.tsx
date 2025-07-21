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
      case "notifications":
        return (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold">Notifications</h1>
            <div className="grid gap-4">
              <div className="p-4 border rounded-lg bg-card">
                <h3 className="font-semibold text-destructive">New Booking Request</h3>
                <p className="text-sm text-muted-foreground mt-1">John Smith requested a quote for NYC → LHR</p>
                <p className="text-xs text-muted-foreground mt-2">2 hours ago</p>
              </div>
              <div className="p-4 border rounded-lg bg-card">
                <h3 className="font-semibold">Payment Received</h3>
                <p className="text-sm text-muted-foreground mt-1">Payment of $8,500 received from Sarah Johnson</p>
                <p className="text-xs text-muted-foreground mt-2">5 hours ago</p>
              </div>
              <div className="p-4 border rounded-lg bg-card">
                <h3 className="font-semibold">Quote Expired</h3>
                <p className="text-sm text-muted-foreground mt-1">Quote for Michael Chen expired - follow up required</p>
                <p className="text-xs text-muted-foreground mt-2">1 day ago</p>
              </div>
            </div>
          </div>
        );
      case "settings":
        return (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold">Settings</h1>
            <div className="grid gap-6">
              <div className="p-6 border rounded-lg bg-card">
                <h3 className="font-semibold mb-4">Account Settings</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>Email Notifications</span>
                    <Button variant="outline" size="sm">Configure</Button>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Profile Information</span>
                    <Button variant="outline" size="sm">Edit</Button>
                  </div>
                </div>
              </div>
              <div className="p-6 border rounded-lg bg-card">
                <h3 className="font-semibold mb-4">System Preferences</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>Theme</span>
                    <Button variant="outline" size="sm">Dark Mode</Button>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Language</span>
                    <Button variant="outline" size="sm">English</Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return <Dashboard setCurrentView={setCurrentView} />;
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
