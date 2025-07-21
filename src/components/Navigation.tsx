import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Calendar,
  Bell,
  Settings,
  Menu,
  Plane
} from "lucide-react";

interface NavigationProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

const Navigation = ({ currentView, onViewChange }: NavigationProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
      badge: "247"
    },
    {
      id: "requests",
      label: "Active Requests",
      icon: FileText,
      badge: "18"
    },
    {
      id: "bookings",
      label: "Bookings",
      icon: Calendar,
      badge: "32"
    }
  ];

  const NavItems = () => (
    <>
      {navigationItems.map((item) => (
        <Button
          key={item.id}
          variant={currentView === item.id ? "default" : "ghost"}
          className={`w-full justify-start ${
            currentView === item.id 
              ? "bg-gradient-to-r from-primary to-primary-light text-primary-foreground" 
              : "text-foreground hover:bg-muted"
          }`}
          onClick={() => {
            onViewChange(item.id);
            setIsMobileMenuOpen(false);
          }}
        >
          <item.icon className="mr-2 h-4 w-4" />
          {item.label}
          {item.badge && (
            <Badge 
              variant={currentView === item.id ? "secondary" : "outline"} 
              className="ml-auto text-xs"
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
      <div className="hidden md:flex w-64 flex-col border-r bg-card">
        <div className="p-6 border-b">
          <div className="flex items-center space-x-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-r from-primary to-primary-light">
              <Plane className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">AviaSales</h2>
              <p className="text-xs text-muted-foreground">Business Class Tickets</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <NavItems />
        </nav>

        <div className="p-4 border-t">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-muted-foreground"
            onClick={() => onViewChange("notifications")}
          >
            <Bell className="mr-2 h-4 w-4" />
            Notifications
            <Badge variant="destructive" className="ml-auto text-xs">3</Badge>
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-muted-foreground mt-2"
            onClick={() => onViewChange("settings")}
          >
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden">
        <div className="flex items-center justify-between p-4 border-b bg-card">
          <div className="flex items-center space-x-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-r from-primary to-primary-light">
              <Plane className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">AviaSales</h2>
            </div>
          </div>
          
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <div className="py-6">
                <div className="flex items-center space-x-2 mb-6">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-r from-primary to-primary-light">
                    <Plane className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">AviaSales</h2>
                    <p className="text-xs text-muted-foreground">Business Class Tickets</p>
                  </div>
                </div>
                
                <nav className="space-y-2">
                  <NavItems />
                  
                  <div className="pt-4 mt-4 border-t space-y-2">
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start text-muted-foreground"
                      onClick={() => {
                        onViewChange("notifications");
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      <Bell className="mr-2 h-4 w-4" />
                      Notifications
                      <Badge variant="destructive" className="ml-auto text-xs">3</Badge>
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start text-muted-foreground"
                      onClick={() => {
                        onViewChange("settings");
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
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