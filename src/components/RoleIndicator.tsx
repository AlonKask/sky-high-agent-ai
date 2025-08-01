import { Badge } from "@/components/ui/badge";
import { Eye } from "lucide-react";
import { useRoleView } from "@/contexts/RoleViewContext";
import { useUserRole } from "@/hooks/useUserRole";

const roleConfig = {
  admin: { label: "Administrator", color: "bg-red-100 text-red-800 border-red-300" },
  manager: { label: "Manager", color: "bg-green-100 text-green-800 border-green-300" },
  supervisor: { label: "Supervisor", color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  gds_expert: { label: "GDS Expert", color: "bg-indigo-100 text-indigo-800 border-indigo-300" },
  agent: { label: "Agent", color: "bg-blue-100 text-blue-800 border-blue-300" },
  user: { label: "User", color: "bg-gray-100 text-gray-800 border-gray-300" }
};

export const RoleIndicator = () => {
  const { selectedViewRole, isRoleSwitchingEnabled } = useRoleView();
  const { role: userRole } = useUserRole();

  // Only show if role switching is enabled and we're not viewing as the user's actual role
  if (!isRoleSwitchingEnabled || !userRole || selectedViewRole === userRole) {
    return null;
  }

  const config = roleConfig[selectedViewRole] || roleConfig.user;

  return (
    <div className="fixed top-4 right-4 z-50">
      <Badge variant="outline" className={`${config.color} px-3 py-1 text-sm font-medium shadow-lg`}>
        <Eye className="h-3 w-3 mr-1" />
        Viewing as {config.label}
      </Badge>
    </div>
  );
};