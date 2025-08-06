import { useState } from "react";
import { UserRole } from "@/hooks/useUserRole";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Eye, Users, Crown, Settings, Briefcase, Headphones, DollarSign, Code } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface RoleSelectorProps {
  currentRole: UserRole;
  selectedViewRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  className?: string;
}

const roleConfig = {
  admin: {
    label: "Administrator",
    icon: Crown,
    color: "text-red-600",
    bgColor: "bg-red-50 border-red-200",
    description: "Full system access with all privileges",
    badge: "All Access"
  },
  manager: {
    label: "Manager",
    icon: Briefcase,
    color: "text-green-600",
    bgColor: "bg-green-50 border-green-200",
    description: "Manage teams and business operations",
    badge: "Management"
  },
  supervisor: {
    label: "Supervisor",
    icon: Settings,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50 border-yellow-200",
    description: "Supervise agents and quality control",
    badge: "Supervisor"
  },
  gds_expert: {
    label: "GDS Expert",
    icon: Settings,
    color: "text-indigo-600",
    bgColor: "bg-indigo-50 border-indigo-200",
    description: "Global Distribution System specialist",
    badge: "GDS Expert"
  },
  agent: {
    label: "Agent",
    icon: Users,
    color: "text-blue-600",
    bgColor: "bg-blue-50 border-blue-200",
    description: "Handle daily operations and client requests",
    badge: "Agent"
  },
  user: {
    label: "User",
    icon: Users,
    color: "text-gray-600", 
    bgColor: "bg-gray-50 border-gray-200",
    description: "Basic user access",
    badge: "Standard"
  }
};

export const RoleSelector = ({ currentRole, selectedViewRole, onRoleChange, className }: RoleSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);

  // Only show roles that the current user has access to
  const availableRoles: UserRole[] = 
    currentRole === 'admin' ? ['admin', 'manager', 'supervisor', 'gds_expert', 'agent', 'user'] :
    currentRole === 'manager' ? ['manager', 'supervisor', 'gds_expert', 'agent', 'user'] :
    currentRole === 'supervisor' ? ['supervisor', 'gds_expert', 'agent', 'user'] :
    ['user'];

  // Fallback to default config if role not found
  const selectedConfig = roleConfig[selectedViewRole] || roleConfig.user;
  const SelectedIcon = selectedConfig.icon;

  return (
    <div className={className}>
      <Card className={`${selectedConfig.bgColor} border transition-all duration-200 hover:shadow-md`}>
        <CardContent className="p-4">
          <div className="flex justify-end mb-3">
            <Badge variant="outline" className="text-xs">
              {selectedConfig.badge}
            </Badge>
          </div>
          
          <Select value={selectedViewRole} onValueChange={onRoleChange}>
            <SelectTrigger className="w-full border-0 bg-transparent p-0 h-auto focus:ring-0">
              <SelectValue>
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-full bg-white/80`}>
                    <SelectedIcon className={`h-5 w-5 ${selectedConfig.color}`} />
                  </div>
                  <div className="text-left">
                    <div className={`font-semibold ${selectedConfig.color}`}>
                      {selectedConfig.label}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {selectedConfig.description}
                    </div>
                  </div>
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {availableRoles.map((role) => {
                const config = roleConfig[role] || roleConfig.user;
                const Icon = config.icon;
                return (
                  <SelectItem key={role} value={role} className="py-3">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-full ${config.bgColor}`}>
                        <Icon className={`h-4 w-4 ${config.color}`} />
                      </div>
                      <div>
                        <div className={`font-medium ${config.color}`}>
                          {config.label}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {config.description}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs ml-auto">
                        {config.badge}
                      </Badge>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
    </div>
  );
};