import { DashboardCore } from "./DashboardCore";
import { useUserRole } from "@/hooks/useUserRole";
import { useRoleView } from "@/contexts/RoleViewContext";
import { useAuth } from "@/hooks/useAuth";
import { useTeamAnalytics } from "@/hooks/useTeamAnalytics";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface EnhancedDashboardProps {
  setCurrentView?: (view: string) => void;
}

const EnhancedDashboard = ({ setCurrentView }: EnhancedDashboardProps) => {
  const { user } = useAuth();
  const { role: userRole, loading: roleLoading } = useUserRole();
  const { selectedViewRole } = useRoleView();
  const { data: teamData, loading: teamLoading } = useTeamAnalytics('month');

  if (roleLoading || teamLoading) {
    return <LoadingSpinner />;
  }

  if (!userRole) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Access Required</h2>
          <p className="text-muted-foreground">Please contact your administrator to assign you a role.</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardCore 
      userRole={userRole}
      selectedViewRole={selectedViewRole}
      teamData={teamData}
      showRoleSpecificActions={true}
    />
  );
};

export default EnhancedDashboard;