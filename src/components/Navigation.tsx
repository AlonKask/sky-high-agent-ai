import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Calendar,
  Bell,
  Settings,
  Menu,
  Plane,
  Mail,
  BarChart3,
  Star,
  Zap
} from "lucide-react";

interface NavigationProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

const Navigation = ({ currentView, onViewChange }: NavigationProps) => {
  const { user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [counts, setCounts] = useState({
    clients: 0,
    requests: 0,
    bookings: 0,
    emails: 0,
    notifications: 0
  });

  useEffect(() => {
    if (user) {
      fetchCounts();
    }
  }, [user]);

  const fetchCounts = async () => {
    if (!user) return;

    try {
      // Get user role to determine data access
      const { data: userRoleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      const userRole = userRoleData?.role || 'user';

      // Build queries based on user role
      let clientsQuery = supabase.from('clients').select('id', { count: 'exact' });
      let requestsQuery = supabase.from('requests').select('id', { count: 'exact' }).in('status', ['pending', 'researching', 'quote_sent']);
      let bookingsQuery = supabase.from('bookings').select('id', { count: 'exact' }).gte('departure_date', new Date().toISOString().split('T')[0]);
      let emailsQuery = supabase.from('email_exchanges').select('id', { count: 'exact' }).eq('direction', 'incoming').eq('status', 'unread');
      let notificationsQuery = supabase.from('notifications').select('id', { count: 'exact' }).eq('read', false);

      // Apply user filtering only for regular users
      if (userRole === 'user') {
        clientsQuery = clientsQuery.eq('user_id', user.id);
        requestsQuery = requestsQuery.eq('user_id', user.id);
        bookingsQuery = bookingsQuery.eq('user_id', user.id);
        emailsQuery = emailsQuery.eq('user_id', user.id);
        notificationsQuery = notificationsQuery.eq('user_id', user.id);
      }

      const [clientsResult, requestsResult, bookingsResult, emailsResult, notificationsResult] = await Promise.all([
        clientsQuery,
        requestsQuery,
        bookingsQuery,
        emailsQuery,
        notificationsQuery
      ]);

      setCounts({
        clients: clientsResult.count || 0,
        requests: requestsResult.count || 0,
        bookings: bookingsResult.count || 0,
        emails: emailsResult.count || 0,
        notifications: notificationsResult.count || 0
      });
    } catch (error) {
      console.error('Error fetching navigation counts:', error);
    }
  };

  const navigationItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      badge: null
    },
    {
      id: "clients",
      label: "Clients",
      icon: Users,
      badge: counts.clients > 0 ? counts.clients.toString() : null
    },
    {
      id: "requests",
      label: "Requests",
      icon: FileText,
      badge: counts.requests > 0 ? counts.requests.toString() : null
    },
    {
      id: "bookings",
      label: "Bookings",
      icon: Calendar,
      badge: counts.bookings > 0 ? counts.bookings.toString() : null
    },
    {
      id: "email",
      label: "Email",
      icon: Mail,
      badge: counts.emails > 0 ? counts.emails.toString() : null
    }
  ];

  const NavItems = () => (
    <>
      {navigationItems.map((item) => (
        <button
          key={item.id}
          className={`nav-item w-full ${currentView === item.id ? 'nav-item-active' : ''}`}
          onClick={() => {
            onViewChange(item.id);
            setIsMobileMenuOpen(false);
          }}
        >
          <item.icon className="h-4 w-4" />
          <span className="text-left flex-1">{item.label}</span>
          {item.badge && (
            <Badge variant="secondary" className="text-xs">
              {item.badge}
            </Badge>
          )}
        </button>
      ))}
    </>
  );

  return (
    <>
      {/* Desktop Navigation */}
      <div className="hidden md:flex w-64 flex-col border-r bg-card">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <Plane className="h-5 w-5 text-primary" />
            <span className="font-semibold">TravelManager</span>
          </div>
        </div>
        
        <nav className="flex-1 p-3 space-y-1">
          <NavItems />
        </nav>

        <div className="p-3 border-t space-y-1">
          <button 
            className={`nav-item w-full ${currentView === "notifications" ? 'nav-item-active' : ''}`}
            onClick={() => onViewChange("notifications")}
          >
            <Bell className="h-4 w-4" />
            <span className="flex-1 text-left">Notifications</span>
            {counts.notifications > 0 && (
              <Badge variant="destructive" className="text-xs">
                {counts.notifications}
              </Badge>
            )}
          </button>
          <button 
            className={`nav-item w-full ${currentView === "settings" ? 'nav-item-active' : ''}`}
            onClick={() => onViewChange("settings")}
          >
            <Settings className="h-4 w-4" />
            <span className="flex-1 text-left">Settings</span>
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden">
        <div className="flex items-center justify-between p-4 border-b bg-card/50 backdrop-blur-sm">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-r from-primary to-primary-light">
              <Plane className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                ExecutiveTravel
              </h2>
            </div>
          </div>
          
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Menu className="h-6 w-6" />
                {(counts.notifications + counts.requests + counts.emails) > 0 && (
                  <div className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-pulse"></div>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 p-0">
              <div className="flex flex-col h-full">
                <div className="p-6 border-b">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-r from-primary to-primary-light">
                      <Plane className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                        ExecutiveTravel
                      </h2>
                      <p className="text-xs text-muted-foreground">Premium Business Travel</p>
                    </div>
                  </div>
                </div>
                
                <nav className="flex-1 p-4 space-y-2">
                  <NavItems />
                  
                  <div className="pt-4 mt-4 border-t space-y-2">
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        onViewChange("notifications");
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      <Bell className="mr-3 h-5 w-5" />
                      <span className="flex-1 text-left">Notifications</span>
                      {counts.notifications > 0 && (
                        <Badge variant="destructive" className="ml-auto text-xs">
                          {counts.notifications}
                        </Badge>
                      )}
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        onViewChange("settings");
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      <Settings className="mr-3 h-5 w-5" />
                      <span className="flex-1 text-left">Settings</span>
                    </Button>
                  </div>
                </nav>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </>
  );
};

export default Navigation;