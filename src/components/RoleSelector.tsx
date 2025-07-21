import { useState } from "react";
import { UserRole } from "@/hooks/useUserRole";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Eye, Users, Crown } from "lucide-react";
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
  moderator: {
    label: "Moderator", 
    icon: Shield,
    color: "text-orange-600",
    bgColor: "bg-orange-50 border-orange-200",
    description: "Manage bookings and client relationships",
    badge: "Limited Admin"
  },
  user: {
    label: "Agent",
    icon: Users,
    color: "text-blue-600", 
    bgColor: "bg-blue-50 border-blue-200",
    description: "Handle daily operations and client requests",
    badge: "Standard"
  }
};

export const RoleSelector = ({ currentRole, selectedViewRole, onRoleChange, className }: RoleSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);

  // Only show roles that the current user has access to
  const availableRoles: UserRole[] = 
    currentRole === 'admin' ? ['admin', 'moderator', 'user'] :
    currentRole === 'moderator' ? ['moderator', 'user'] :
    ['user'];

  const selectedConfig = roleConfig[selectedViewRole];
  const SelectedIcon = selectedConfig.icon;

  return (
    <div className={className}>
      <Card className={`${selectedConfig.bgColor} border transition-all duration-200 hover:shadow-md`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Viewing as:</span>
            </div>
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
                const config = roleConfig[role];
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