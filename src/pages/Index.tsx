import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import EnhancedDashboard from "@/components/EnhancedDashboard";
import ClientManager from "@/components/ClientManager";
import RequestManager from "@/components/RequestManager";
import BookingManager from "@/components/BookingManager";
import EmailManager from "@/components/EmailManager";
import { NotificationCenter } from "@/components/NotificationCenter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, User, Settings as SettingsIcon, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const [currentView, setCurrentView] = useState("dashboard");
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  // Fetch unread notifications count
  useEffect(() => {
    if (user) {
      fetchUnreadNotificationsCount();
      setupNotificationSubscription();
    }
  }, [user]);

  const fetchUnreadNotificationsCount = async () => {
    try {
      // Get user role to determine data access
      const { data: userRoleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      const userRole = userRoleData?.role || 'user';

      // Build query based on user role
      let query = supabase
        .from('notifications')
        .select('id')
        .eq('read', false);

      // Apply user filtering only for regular users
      if (userRole === 'user') {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setUnreadNotificationsCount(data?.length || 0);
    } catch (error) {
      console.error('Error fetching notification count:', error);
    }
  };

  const setupNotificationSubscription = () => {
    const channel = supabase
      .channel('notification-count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          // Refetch count when notifications change
          fetchUnreadNotificationsCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

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
        return <NotificationCenter />;
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
    <div className="min-h-screen bg-background p-6">
      {/* Simple Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <p className="text-sm text-muted-foreground">Welcome back</p>
          <p className="font-medium">{user.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setCurrentView("notifications")} className="relative">
            <Bell className="h-4 w-4" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-foreground text-background text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
              </span>
            )}
          </Button>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>
      {renderCurrentView()}
    </div>
  );
};

export default Index;