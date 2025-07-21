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
      const [clientsResult, requestsResult, bookingsResult, emailsResult] = await Promise.all([
        supabase.from('clients').select('id', { count: 'exact' }).eq('user_id', user.id),
        supabase.from('requests').select('id', { count: 'exact' }).eq('user_id', user.id).in('status', ['pending', 'researching', 'quote_sent']),
        supabase.from('bookings').select('id', { count: 'exact' }).eq('user_id', user.id).gte('departure_date', new Date().toISOString().split('T')[0]),
        supabase.from('email_exchanges').select('id', { count: 'exact' }).eq('user_id', user.id).eq('direction', 'incoming').eq('status', 'unread')
      ]);

      setCounts({
        clients: clientsResult.count || 0,
        requests: requestsResult.count || 0,
        bookings: bookingsResult.count || 0,
        emails: emailsResult.count || 0,
        notifications: 3 // Keep this as a static number for demo purposes
      });
    } catch (error) {
      console.error('Error fetching navigation counts:', error);
    }
  };

  const navigationItems = [
    {
      id: "dashboard",
      label: "Executive Dashboard",
      icon: LayoutDashboard,
      badge: null,
      description: "Overview & Analytics"
    },
    {
      id: "clients",
      label: "Client Portfolio",
      icon: Users,
      badge: counts.clients > 0 ? counts.clients.toString() : null,
      description: "VIP Client Management"
    },
    {
      id: "requests",
      label: "Travel Requests",
      icon: FileText,
      badge: counts.requests > 0 ? counts.requests.toString() : null,
      description: "Active Quotes & Proposals"
    },
    {
      id: "bookings",
      label: "Flight Bookings",
      icon: Calendar,
      badge: counts.bookings > 0 ? counts.bookings.toString() : null,
      description: "Confirmed Reservations"
    },
    {
      id: "email",
      label: "Communication Hub",
      icon: Mail,
      badge: counts.emails > 0 ? counts.emails.toString() : null,
      description: "Email Management"
    }
  ];

  const NavItems = () => (
    <>
      {navigationItems.map((item) => (
        <Button
          key={item.id}
          variant={currentView === item.id ? "default" : "ghost"}
          className={`w-full justify-start group transition-all duration-200 ${
            currentView === item.id 
              ? "bg-gradient-to-r from-primary to-primary-light text-primary-foreground shadow-md" 
              : "text-foreground hover:bg-muted hover:shadow-sm"
          }`}
          onClick={() => {
            onViewChange(item.id);
            setIsMobileMenuOpen(false);
          }}
        >
          <item.icon className={`mr-3 h-5 w-5 transition-transform duration-200 ${currentView === item.id ? 'scale-110' : 'group-hover:scale-105'}`} />
          <div className="flex-1 text-left">
            <div className="font-medium">{item.label}</div>
            <div className="text-xs opacity-75 hidden lg:block">{item.description}</div>
          </div>
          {item.badge && (
            <Badge 
              variant={currentView === item.id ? "secondary" : "outline"} 
              className={`ml-auto text-xs transition-all duration-200 ${
                currentView === item.id ? 'bg-white/20 text-white border-white/30' : ''
              }`}
            >
              {item.badge}
            </Badge>
          )}
        </Button>
      ))}
    </>
  );

  return (
    <>
      {/* Desktop Navigation */}
      <div className="hidden md:flex w-80 flex-col border-r bg-card/50 backdrop-blur-sm">
        <div className="p-6 border-b border-border/50">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-r from-primary to-primary-light shadow-md">
              <Plane className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                ExecutiveTravel
              </h2>
              <p className="text-sm text-muted-foreground">Premium Business Travel</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <NavItems />
        </nav>

        <div className="p-4 border-t border-border/50 space-y-2">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200"
            onClick={() => onViewChange("notifications")}
          >
            <Bell className="mr-3 h-5 w-5" />
            <span className="flex-1 text-left">Notifications</span>
            {counts.notifications > 0 && (
              <Badge variant="destructive" className="ml-auto text-xs animate-pulse">
                {counts.notifications}
              </Badge>
            )}
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200"
            onClick={() => onViewChange("settings")}
          >
            <Settings className="mr-3 h-5 w-5" />
            <span className="flex-1 text-left">Settings</span>
          </Button>
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