import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { NotificationCenter } from "@/components/NotificationCenter";
import { GmailStatusButton } from "@/components/GmailStatusButton";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <main className="flex-1 overflow-hidden">
          <div className="h-full overflow-auto relative">
            <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
              <GmailStatusButton />
              <NotificationCenter />
            </div>
            <div className="p-6">
              {children}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};