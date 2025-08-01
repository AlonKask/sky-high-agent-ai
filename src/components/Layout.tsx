import { AuthGuard } from "@/components/AuthGuard";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { NotificationCenter } from "@/components/NotificationCenter";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <AuthGuard>
      <SidebarProvider>
        <div className="flex h-screen w-full">
          <AppSidebar />
          <main className="flex-1 overflow-hidden">
            <div className="h-full overflow-auto relative">
              <NotificationCenter />
              {children}
            </div>
          </main>
        </div>
      </SidebarProvider>
    </AuthGuard>
  );
};