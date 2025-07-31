import { Badge } from "@/components/ui/badge";
import { Eye } from "lucide-react";
import { useRoleView } from "@/contexts/RoleViewContext";
import { useUserRole } from "@/hooks/useUserRole";

const roleConfig = {
  admin: { label: "Administrator", color: "bg-red-100 text-red-800 border-red-300" },
  moderator: { label: "Moderator", color: "bg-orange-100 text-orange-800 border-orange-300" },
  user: { label: "Agent", color: "bg-blue-100 text-blue-800 border-blue-300" },
  dev: { label: "Developer", color: "bg-purple-100 text-purple-800 border-purple-300" },
  manager: { label: "Manager", color: "bg-green-100 text-green-800 border-green-300" },
  supervisor: { label: "Supervisor", color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  gds_expert: { label: "GDS Expert", color: "bg-indigo-100 text-indigo-800 border-indigo-300" },
  cs_agent: { label: "Customer Service", color: "bg-teal-100 text-teal-800 border-teal-300" },
  sales_agent: { label: "Sales Agent", color: "bg-emerald-100 text-emerald-800 border-emerald-300" }
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