import { useUserRole } from "@/hooks/useUserRole";
import { AppSidebar } from "./AppSidebar";
import { 
  SidebarProvider, 
  SidebarTrigger 
} from "@/components/ui/sidebar";

interface RoleBasedNavProps {
  children: React.ReactNode;
}

export const RoleBasedNav = ({ children }: RoleBasedNavProps) => {
  const { role, loading } = useUserRole();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // User role gets minimal navigation
  if (role === 'user') {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <main className="flex-1 flex flex-col">
            <header className="h-12 flex items-center border-b px-4">
              <SidebarTrigger />
              <h1 className="ml-4 font-semibold">My Cabinet</h1>
            </header>
            <div className="flex-1 p-6">
              {children}
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  // Staff roles get full navigation
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col">
          <header className="h-12 flex items-center border-b px-4">
            <SidebarTrigger />
            <div className="ml-4">
              <span className="font-semibold text-lg">Travel CRM</span>
              <span className="ml-2 text-sm text-muted-foreground capitalize">
                {role} Dashboard
              </span>
            </div>
          </header>
          <div className="flex-1 p-6">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};