import { SidebarProvider } from "@/components/ui/sidebar";
import { BasicSidebar } from "@/components/BasicSidebar";
import { BasicNotification } from "@/components/BasicNotification";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <BasicSidebar />
        <main className="flex-1 overflow-hidden">
          <div className="h-full overflow-auto relative">
            <BasicNotification />
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};