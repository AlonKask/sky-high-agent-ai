import { useState } from "react";
import { 
  Home, 
  Users, 
  Plane, 
  Calendar, 
  BarChart3, 
  Settings,
  Mail,
  MessageSquare,
  FileText,
  ChevronLeft,
  ChevronRight,
  Brain,
  Target,
  Zap,
  TrendingUp,
  Bot,
  Sparkles
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";

const navigationItems = [
  { 
    title: "Dashboard", 
    url: "/", 
    icon: Home,
    description: "Overview and quick stats"
  },
  { 
    title: "Requests", 
    url: "/requests", 
    icon: FileText,
    description: "Manage travel requests"
  },
  { 
    title: "Bookings", 
    url: "/bookings", 
    icon: Plane,
    description: "View and manage bookings"
  },
  { 
    title: "Clients", 
    url: "/clients", 
    icon: Users,
    description: "Client management"
  },
  { 
    title: "Calendar", 
    url: "/calendar", 
    icon: Calendar,
    description: "Schedule and events"
  },
  { 
    title: "Analytics", 
    url: "/analytics/overview", 
    icon: BarChart3,
    description: "Business insights"
  },
];

const communicationItems = [
  { 
    title: "Emails", 
    url: "/emails", 
    icon: Mail,
    description: "Email management"
  },
  { 
    title: "Messages", 
    url: "/messages", 
    icon: MessageSquare,
    description: "SMS and chat"
  },
];

export function AppSidebar() {
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => {
    if (path === "/") {
      return currentPath === "/";
    }
    return currentPath.startsWith(path);
  };

  const getNavCls = (path: string) => {
    return isActive(path) 
      ? "bg-primary text-primary-foreground font-medium hover:bg-primary/90" 
      : "hover:bg-accent hover:text-accent-foreground";
  };

  const isCollapsed = true; // Always collapsed

  return (
    <Sidebar
      className="w-16 transition-all duration-300 border-r bg-card"
      collapsible="none"
    >
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Plane className="h-4 w-4 text-primary-foreground" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold">Travel Manager</span>
              <span className="text-xs text-muted-foreground">Professional Suite</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="flex-1 overflow-y-auto">
        <SidebarGroup>
          <SidebarGroupLabel className={isCollapsed ? "sr-only" : ""}>
            Main Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${getNavCls(item.url)}`}
                      title={isCollapsed ? item.title : ""}
                    >
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      {!isCollapsed && (
                        <div className="flex flex-col">
                          <span>{item.title}</span>
                          <span className="text-xs text-muted-foreground">{item.description}</span>
                        </div>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className={isCollapsed ? "sr-only" : ""}>
            Communication
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {communicationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${getNavCls(item.url)}`}
                      title={isCollapsed ? item.title : ""}
                    >
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      {!isCollapsed && (
                        <div className="flex flex-col">
                          <span>{item.title}</span>
                          <span className="text-xs text-muted-foreground">{item.description}</span>
                        </div>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink 
                    to="/settings" 
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${getNavCls("/settings")}`}
                    title={isCollapsed ? "Settings" : ""}
                  >
                    <Settings className="h-4 w-4 flex-shrink-0" />
                    {!isCollapsed && (
                      <div className="flex flex-col">
                        <span>Settings</span>
                        <span className="text-xs text-muted-foreground">App preferences</span>
                      </div>
                    )}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}