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

  // Debug logging
  console.log('RoleDashboard - role:', role, 'selectedViewRole:', selectedViewRole, 'isRoleSwitchingEnabled:', isRoleSwitchingEnabled);

  // Use role-specific dashboards - prioritize actual role for admin and manager
  if (role === 'admin') {
    console.log('Rendering DeveloperDashboard for admin role');
    return <DeveloperDashboard />;
  }
  
  if (role === 'manager') {
    console.log('Rendering ManagerDashboard for manager role');
    return <ManagerDashboard />;
  }
  
  if (selectedViewRole === 'supervisor' || role === 'supervisor') {
    console.log('Rendering SupervisorDashboard');
    return <SupervisorDashboard />;
  }

  // Default to enhanced dashboard for all other authenticated users
  console.log('Rendering EnhancedDashboard as default');
  return <EnhancedDashboard />;
};