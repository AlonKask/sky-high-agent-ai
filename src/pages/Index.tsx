
import { useSimpleAuth } from "@/hooks/useSimpleAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SimpleDashboard } from "@/components/SimpleDashboard";
import { AdminDashboard } from "@/pages/AdminDashboard";
import { ManagerDashboard } from "@/pages/ManagerDashboard";
import { AgentDashboard } from "@/pages/AgentDashboard";

const Index = () => {
  const { user, loading: authLoading } = useSimpleAuth();
  const { role, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, authLoading, navigate]);

  if (authLoading || roleLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Role-based dashboard routing
  switch (role) {
    case 'admin':
      return <AdminDashboard />;
    case 'manager':
    case 'supervisor':
      return <ManagerDashboard />;
    case 'agent':
      return <AgentDashboard />;
    default:
      return <SimpleDashboard />;
  }
};

export default Index;
