import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Navigation from "@/components/Navigation";
import EnhancedDashboard from "@/components/EnhancedDashboard";
import ClientManager from "@/components/ClientManager";
import RequestManager from "@/components/RequestManager";
import BookingManager from "@/components/BookingManager";
import EmailManager from "@/components/EmailManager";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, User, Settings as SettingsIcon, Bell } from "lucide-react";

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
        return <EnhancedDashboard setCurrentView={setCurrentView} />;
      case "clients":
        return <ClientManager />;
      case "requests":
        return <RequestManager />;
      case "bookings":
        return <BookingManager />;
      case "email":
        return <EmailManager />;
      case "notifications":
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-gradient">Notifications Center</h1>
              <Badge variant="destructive" className="text-sm px-3 py-1">3 New</Badge>
            </div>
            <div className="grid gap-4">
              <div className="p-6 border-2 rounded-xl bg-gradient-to-r from-red-50 to-red-100 border-red-200 hover:shadow-lg transition-all duration-200">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-red-800 flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      Urgent: High-Value Client Request
                    </h3>
                    <p className="text-sm text-red-700 mt-2">John Smith (VIP) requested quote for NYC → LHR Business Class</p>
                    <p className="text-xs text-red-600 mt-2 font-medium">2 hours ago • Response time: 94% SLA remaining</p>
                  </div>
                  <Badge variant="destructive" className="text-xs">High Priority</Badge>
                </div>
              </div>
              <div className="p-6 border-2 rounded-xl bg-gradient-to-r from-green-50 to-green-100 border-green-200 hover:shadow-lg transition-all duration-200">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-green-800">Payment Received</h3>
                    <p className="text-sm text-green-700 mt-2">Payment of $12,000 received from Sarah Johnson for LAX → NRT</p>
                    <p className="text-xs text-green-600 mt-2">5 hours ago • Booking confirmed automatically</p>
                  </div>
                  <Badge className="bg-green-500 text-white text-xs">Completed</Badge>
                </div>
              </div>
              <div className="p-6 border-2 rounded-xl bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200 hover:shadow-lg transition-all duration-200">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-orange-800">Quote Expiring Soon</h3>
                    <p className="text-sm text-orange-700 mt-2">Quote for Michael Chen expires in 24 hours - follow up recommended</p>
                    <p className="text-xs text-orange-600 mt-2">1 day ago • $7,800 quote value</p>
                  </div>
                  <Badge className="bg-orange-500 text-white text-xs">Action Required</Badge>
                </div>
              </div>
            </div>
          </div>
        );
      case "settings":
        return (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gradient">System Settings</h1>
            <div className="grid gap-6">
              <div className="p-6 border-2 rounded-xl bg-card hover:shadow-lg transition-all duration-200">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Account Settings
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 border rounded-lg">
                    <div>
                      <span className="font-medium">Email Notifications</span>
                      <p className="text-sm text-muted-foreground">Receive updates on bookings and requests</p>
                    </div>
                    <Button variant="outline" size="sm">Configure</Button>
                  </div>
                  <div className="flex justify-between items-center p-4 border rounded-lg">
                    <div>
                      <span className="font-medium">Profile Information</span>
                      <p className="text-sm text-muted-foreground">Update your personal details</p>
                    </div>
                    <Button variant="outline" size="sm">Edit Profile</Button>
                  </div>
                  <div className="flex justify-between items-center p-4 border rounded-lg">
                    <div>
                      <span className="font-medium">Security Settings</span>
                      <p className="text-sm text-muted-foreground">Password and two-factor authentication</p>
                    </div>
                    <Button variant="outline" size="sm">Manage</Button>
                  </div>
                </div>
              </div>
              <div className="p-6 border-2 rounded-xl bg-card hover:shadow-lg transition-all duration-200">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <SettingsIcon className="h-5 w-5" />
                  System Preferences
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 border rounded-lg">
                    <div>
                      <span className="font-medium">Theme Preference</span>
                      <p className="text-sm text-muted-foreground">Choose light or dark mode</p>
                    </div>
                    <Button variant="outline" size="sm">Light Mode</Button>
                  </div>
                  <div className="flex justify-between items-center p-4 border rounded-lg">
                    <div>
                      <span className="font-medium">Language & Region</span>
                      <p className="text-sm text-muted-foreground">Set your preferred language</p>
                    </div>
                    <Button variant="outline" size="sm">English (US)</Button>
                  </div>
                  <div className="flex justify-between items-center p-4 border rounded-lg">
                    <div>
                      <span className="font-medium">Time Zone</span>
                      <p className="text-sm text-muted-foreground">Your local time zone for scheduling</p>
                    </div>
                    <Button variant="outline" size="sm">EST (UTC-5)</Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return <EnhancedDashboard setCurrentView={setCurrentView} />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
        <main className="flex-1 p-6">
          {/* Simple Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <p className="text-sm text-muted-foreground">Welcome back</p>
              <p className="font-medium">{user.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setCurrentView("notifications")}>
                <Bell className="h-4 w-4" />
                <Badge variant="destructive" className="ml-1 h-4 w-4 p-0 text-xs">
                  3
                </Badge>
              </Button>
              <Button variant="ghost" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
          {renderCurrentView()}
        </main>
      </div>
    </div>
  );
};

export default Index;