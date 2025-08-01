import { useUserRole, UserRole } from './useUserRole';

interface Permission {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

const rolePermissions: Record<UserRole, Record<string, Permission>> = {
  admin: {
    clients: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    requests: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    bookings: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    emails: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    messages: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    analytics: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    users: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    reports: { canView: true, canCreate: true, canEdit: true, canDelete: true },
  },
  manager: {
    clients: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    requests: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    bookings: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    emails: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    messages: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    analytics: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    users: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    reports: { canView: true, canCreate: true, canEdit: true, canDelete: true },
  },
  supervisor: {
    clients: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    requests: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    bookings: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    emails: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    messages: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    analytics: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    users: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    reports: { canView: true, canCreate: true, canEdit: false, canDelete: false },
  },
  gds_expert: {
    clients: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    requests: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    bookings: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    emails: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    messages: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    analytics: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    users: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    reports: { canView: true, canCreate: false, canEdit: false, canDelete: false },
  },
  agent: {
    clients: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    requests: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    bookings: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    emails: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    messages: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    analytics: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    users: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    reports: { canView: true, canCreate: false, canEdit: false, canDelete: false },
  },
  user: {
    clients: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    requests: { canView: true, canCreate: true, canEdit: false, canDelete: false },
    bookings: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    emails: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    messages: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    analytics: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    users: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    reports: { canView: true, canCreate: false, canEdit: false, canDelete: false },
  },
};

export const usePermissions = () => {
  const { role } = useUserRole();

  const getPermission = (resource: string): Permission => {
    if (!role) {
      return { canView: false, canCreate: false, canEdit: false, canDelete: false };
    }

    return rolePermissions[role]?.[resource] || 
           { canView: false, canCreate: false, canEdit: false, canDelete: false };
  };

  const canAccess = (resource: string, action: 'view' | 'create' | 'edit' | 'delete' = 'view'): boolean => {
    const permission = getPermission(resource);
    
    switch (action) {
      case 'view': return permission.canView;
      case 'create': return permission.canCreate;
      case 'edit': return permission.canEdit;
      case 'delete': return permission.canDelete;
      default: return false;
    }
  };

  return {
    getPermission,
    canAccess,
    role,
  };
};