import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserRole, useUserRole } from '@/hooks/useUserRole';

interface RoleViewContextType {
  selectedViewRole: UserRole;
  setSelectedViewRole: (role: UserRole) => void;
  availableRoles: UserRole[];
  isRoleSwitchingEnabled: boolean;
}

const RoleViewContext = createContext<RoleViewContextType | undefined>(undefined);

export const useRoleView = () => {
  const context = useContext(RoleViewContext);
  if (context === undefined) {
    throw new Error('useRoleView must be used within a RoleViewProvider');
  }
  return context;
};

interface RoleViewProviderProps {
  children: ReactNode;
}

export const RoleViewProvider = ({ children }: RoleViewProviderProps) => {
  const { role: userRole, loading: roleLoading } = useUserRole();
  const [selectedViewRole, setSelectedViewRoleState] = useState<UserRole>('user');

  // Calculate available roles based on user's actual role
  const getAvailableRoles = (currentRole: UserRole): UserRole[] => {
    switch (currentRole) {
      case 'admin':
        return ['admin' as UserRole, 'manager' as UserRole, 'supervisor' as UserRole, 'gds_expert' as UserRole, 'agent' as UserRole, 'user' as UserRole];
      case 'manager':
        return ['manager' as UserRole, 'supervisor' as UserRole, 'gds_expert' as UserRole, 'agent' as UserRole, 'user' as UserRole];
      case 'supervisor':
        return ['supervisor' as UserRole, 'gds_expert' as UserRole, 'agent' as UserRole, 'user' as UserRole];
      default:
        return ['user' as UserRole];
    }
  };

  const availableRoles = userRole ? getAvailableRoles(userRole) : ['user' as UserRole];
  const isRoleSwitchingEnabled = userRole && userRole !== 'user' && availableRoles.length > 1;

  // Initialize selected role from localStorage or default to user's actual role
  useEffect(() => {
    if (userRole && !roleLoading) {
      const savedRole = localStorage.getItem('selectedViewRole') as UserRole;
      if (savedRole && availableRoles.includes(savedRole)) {
        setSelectedViewRoleState(savedRole);
      } else {
        setSelectedViewRoleState(userRole);
      }
    }
  }, [userRole, roleLoading, availableRoles]);

  // Persist role changes to localStorage
  const setSelectedViewRole = (role: UserRole) => {
    if (availableRoles.includes(role)) {
      setSelectedViewRoleState(role);
      localStorage.setItem('selectedViewRole', role);
    }
  };

  const value = {
    selectedViewRole,
    setSelectedViewRole,
    availableRoles,
    isRoleSwitchingEnabled
  };

  return (
    <RoleViewContext.Provider value={value}>
      {children}
    </RoleViewContext.Provider>
  );
};