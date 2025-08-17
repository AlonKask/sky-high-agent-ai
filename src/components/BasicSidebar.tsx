import {
  Calendar,
  Home,
  Inbox,
  Search,
  Settings,
  Users,
  FileText,
  PlusCircle,
  UserCog,
  Quote,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useSimpleAuth } from "@/hooks/useSimpleAuth"
import { useUserRole } from "@/hooks/useUserRole"
import { Button } from "@/components/ui/button"
import { useNavigate, Link } from "react-router-dom"

// Get role-specific menu items
const getMenuItems = (role: string | null) => {
  const baseItems = [
    {
      title: "Home",
      url: "/",
      icon: Home,
    },
    {
      title: "Clients", 
      url: "/clients",
      icon: Users,
    },
    {
      title: "Requests",
      url: "/requests", 
      icon: FileText,
    },
    {
      title: "Emails",
      url: "/emails",
      icon: Inbox,
    },
    {
      title: "Quote Builder",
      url: "/quote-builder",
      icon: Quote,
    }
  ];

  const adminItems = [
    {
      title: "User Management",
      url: "/admin/users",
      icon: UserCog,
    },
    {
      title: "Management",
      url: "/management", 
      icon: UserCog,
    }
  ];

  const managerItems = [
    {
      title: "Client Assignment",
      url: "/manager/assign-clients",
      icon: Users,
    },
    {
      title: "Team Management",
      url: "/manager/team",
      icon: UserCog,
    }
  ];

  switch (role) {
    case 'admin':
      return [...baseItems, ...adminItems, {
        title: "Settings",
        url: "/settings",
        icon: Settings,
      }];
    case 'manager':
    case 'supervisor':
      return [...baseItems, ...managerItems, {
        title: "Settings", 
        url: "/settings",
        icon: Settings,
      }];
    default:
      return [...baseItems, {
        title: "Settings",
        url: "/settings", 
        icon: Settings,
      }];
  }
}

export function BasicSidebar() {
  const { signOut } = useSimpleAuth()
  const { role } = useUserRole()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate("/auth")
  }

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Application</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {getMenuItems(role).map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <div className="mt-auto p-4">
          <Button onClick={handleSignOut} variant="outline" className="w-full">
            Sign Out
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  )
}