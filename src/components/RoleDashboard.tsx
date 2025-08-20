import { useUserRole } from "@/hooks/useUserRole";
import { useRoleView } from "@/contexts/RoleViewContext";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { UserCabinet } from "./UserCabinet";
import EnhancedDashboard from "./EnhancedDashboard";
import { ManagerDashboard } from "./dashboards/ManagerDashboard";
import { SupervisorDashboard } from "./dashboards/SupervisorDashboard";

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

  // User role gets UserCabinet
  if (role === 'user') {
    return <UserCabinet />;
  }

  // Use role-specific dashboards when appropriate
  if (selectedViewRole === 'supervisor' || role === 'supervisor') {
    return <SupervisorDashboard />;
  }
  
  if (selectedViewRole === 'manager' || role === 'manager') {
    return <ManagerDashboard />;
  }

  // Default to enhanced dashboard for staff roles
  return <EnhancedDashboard />;
};