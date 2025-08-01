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

  // Use enhanced dashboard for role switching if enabled, otherwise use role-specific dashboards
  if (isRoleSwitchingEnabled) {
    return <EnhancedDashboard />;
  }

  // Fallback to role-specific dashboards for users without role switching
  switch (role) {
    case 'admin':
      return <DeveloperDashboard />;
    case 'manager':
      return <ManagerDashboard />;
    case 'supervisor':
      return <SupervisorDashboard />;
    case 'gds_expert':
      return <GDSExpertDashboard />;
    case 'agent':
      return <CSAgentDashboard />;
    default:
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Unknown Role</h2>
            <p className="text-muted-foreground">Your role is not recognized. Please contact support.</p>
          </div>
        </div>
      );
  }
};