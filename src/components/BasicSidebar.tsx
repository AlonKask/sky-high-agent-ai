import {
  Calendar,
  Home,
  Inbox,
  Search,
  Settings,
  Users,
  FileText,
  PlusCircle,
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
import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"

// Menu items
const items = [
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
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
]

export function BasicSidebar() {
  const { signOut } = useSimpleAuth()
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
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
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