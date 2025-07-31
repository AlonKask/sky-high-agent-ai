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
    url: "/analytics", 
    icon: BarChart3,
    description: "Business insights"
  },
  { 
    title: "Reports", 
    url: "/reports", 
    icon: FileText,
    description: "Advanced reports"
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
       ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90" 
       : "hover:bg-accent/80 hover:text-accent-foreground hover:scale-105";
   };

  const isCollapsed = true; // Always collapsed

  return (
    <Sidebar
      className="w-16 transition-all duration-300 border-r bg-card"
      collapsible="none"
    >
      <SidebarHeader className="border-b p-3">
        <div className="flex items-center justify-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
            <Plane className="h-5 w-5 text-primary" />
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
                       className={`flex items-center justify-center w-full rounded-xl py-3 transition-all duration-200 ${getNavCls(item.url)}`}
                       title={isCollapsed ? item.title : ""}
                     >
                       <item.icon className="h-5 w-5" />
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
                       className={`flex items-center justify-center w-full rounded-xl py-3 transition-all duration-200 ${getNavCls(item.url)}`}
                       title={isCollapsed ? item.title : ""}
                     >
                       <item.icon className="h-5 w-5" />
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
                     className={`flex items-center justify-center w-full rounded-xl py-3 transition-all duration-200 ${getNavCls("/settings")}`}
                     title={isCollapsed ? "Settings" : ""}
                   >
                     <Settings className="h-5 w-5" />
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