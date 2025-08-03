import { useUserRole } from "@/hooks/useUserRole";
import { useRoleView } from "@/contexts/RoleViewContext";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import EnhancedDashboard from "./EnhancedDashboard";
import { DeveloperDashboard } from "./dashboards/DeveloperDashboard";
import { ManagerDashboard } from "./dashboards/ManagerDashboard";
import { SupervisorDashboard } from "./dashboards/SupervisorDashboard";
import { GDSExpertDashboard } from "./dashboards/GDSExpertDashboard";
import { CSAgentDashboard } from "./dashboards/CSAgentDashboard";
import { SalesAgentDashboard } from "./dashboards/SalesAgentDashboard";

export const RoleDashboard = () => {
  const { role, loading } = useUserRole();
  const { selectedViewRole, isRoleSwitchingEnabled } = useRoleView();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!role) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Access Required</h2>
          <p className="text-muted-foreground">Please contact your administrator to assign you a role.</p>
        </div>
      </div>
    );
  }

  // Use role-specific dashboards when appropriate, otherwise enhanced dashboard
  if (selectedViewRole === 'admin' || role === 'admin') {
    return <DeveloperDashboard />;
  }
  
  if (selectedViewRole === 'supervisor' || role === 'supervisor') {
    return <SupervisorDashboard />;
  }
  
  if (selectedViewRole === 'manager' || role === 'manager') {
    return <ManagerDashboard />;
  }

  // Default to enhanced dashboard for all authenticated users
  return <EnhancedDashboard />;
};