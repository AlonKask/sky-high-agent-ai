
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { NotificationCenter } from "@/components/NotificationCenter";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <main className="flex-1 overflow-hidden">
          <div className="h-full overflow-hidden relative">
            <div className="absolute top-4 right-4 z-50 flex items-center gap-3">
              <NotificationCenter />
            </div>
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};
