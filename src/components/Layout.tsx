
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { NotificationCenter } from "@/components/NotificationCenter";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <main className="flex-1 h-full overflow-hidden">
          <div className="h-full relative">
            <div className="absolute top-4 right-4 z-50 flex items-center gap-3">
              <NotificationCenter />
            </div>
            <div className="h-full px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};
