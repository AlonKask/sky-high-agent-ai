import React, { useState, useEffect } from 'react';
import { useSimpleAuth as useAuth } from '@/hooks/useSimpleAuth';
import { useUserRole, UserRole } from '@/hooks/useUserRole';
import { useRoleView } from '@/contexts/RoleViewContext';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toastHelpers } from '@/utils/toastHelpers';
import { Shield, Plus, Search, Edit, Trash2, User, Users as UsersIcon } from 'lucide-react';

interface UserData {
  id: string;
  email: string;
  created_at: string;
  profiles?: {
    first_name?: string;
    last_name?: string;
    company?: string;
    phone?: string;
  };
  user_roles?: {
    role: UserRole;
  }[];
}

// Helper function to generate display name
const getDisplayName = (user: UserData): string => {
  const firstName = user.profiles?.first_name;
  const lastName = user.profiles?.last_name;
  
  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  }
  if (firstName) return firstName;
  if (lastName) return lastName;
  
  // Fallback to email username
  return user.email.split('@')[0];
};

// Helper function to get user initials
const getUserInitials = (user: UserData): string => {
  const firstName = user.profiles?.first_name;
  const lastName = user.profiles?.last_name;
  
  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  }
  if (firstName) return firstName[0].toUpperCase();
  if (lastName) return lastName[0].toUpperCase();
  
  // Fallback to email
  const email = user.email;
  return email[0].toUpperCase();
};

const Users = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { role } = useUserRole();
  const { selectedViewRole } = useRoleView();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [newUserData, setNewUserData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    company: '',
    phone: '',
    role: 'user' as UserRole
  });
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [emailValid, setEmailValid] = useState(true);

  useEffect(() => {
    if (user && ['supervisor', 'manager', 'admin'].includes(selectedViewRole || '')) {
      fetchUsers();
    }
  }, [user, selectedViewRole]);

  // Handle URL parameters for filtering
  useEffect(() => {
    const filter = searchParams.get('filter');
    const status = searchParams.get('status');
    
    if (filter === 'agents' && status === 'online') {
      // This would be implemented with real-time status from Supabase
      console.log('Filtering for online agents');
    }
  }, [searchParams]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      console.log('Fetching users...');
      
      // Fetch all profiles first
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          first_name,
          last_name,
          company,
          phone,
          created_at
        `);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }

      console.log('Raw profiles data:', profilesData);

      // Fetch user roles and team memberships
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id, role');
      
      // Fetch team memberships for context
      const { data: teamData, error: teamError } = await supabase
        .from('team_members')
        .select(`
          user_id,
          teams!inner(name)
        `);

      if (roleError) {
        console.error('Error fetching roles:', roleError);
        throw roleError;
      }

      console.log('Raw role data:', roleData);

      // Combine the data
      const usersWithRoles = profilesData?.map(user => {
        const userRoles = roleData?.filter(r => r.user_id === user.id).map(r => ({ role: r.role as UserRole })) || [];
        const userTeams = teamData?.filter(t => t.user_id === user.id) || [];
        
        return {
          id: user.id,
          email: user.email || 'No email',
          created_at: user.created_at,
          profiles: {
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            company: user.company || '',
            phone: user.phone || ''
          },
          user_roles: userRoles,
          teams: userTeams
        };
      }) || [];

      console.log('Processed user data:', usersWithRoles);
      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toastHelpers.error('Failed to load users', error);
    } finally {
      setLoading(false);
    }
  };

  // Email validation function
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(email);
    setEmailValid(isValid);
    return isValid;
  };

  // Password strength calculation
  const calculatePasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    setPasswordStrength(strength);
    return strength;
  };

  const createUser = async () => {
    try {
      if (!newUserData.email || !newUserData.password || !newUserData.firstName || !newUserData.lastName || !newUserData.role) {
        toastHelpers.error('Please fill in all required fields');
        return;
      }

      if (!validateEmail(newUserData.email)) {
        toastHelpers.error('Please enter a valid email address');
        return;
      }

      if (passwordStrength < 3) {
        toastHelpers.error('Password is too weak. Please use a stronger password.');
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: newUserData.email,
          password: newUserData.password,
          firstName: newUserData.firstName,
          lastName: newUserData.lastName,
          role: newUserData.role,
          phone: newUserData.phone || undefined,
          company: newUserData.company || undefined
        }
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to create user');
      }

      toastHelpers.success(`Successfully created user ${newUserData.firstName} ${newUserData.lastName}`);
      
      // Reset form
      setNewUserData({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        company: '',
        phone: '',
        role: 'user' as UserRole
      });
      setPasswordStrength(0);
      setEmailValid(true);
      
      setShowAddUserDialog(false);
      fetchUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toastHelpers.error('Failed to create user', error);
    }
  };

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    try {
      console.log('Updating role for user:', userId, 'to role:', newRole);
      
      const { data, error } = await supabase
        .from('user_roles')
        .upsert({ 
          user_id: userId, 
          role: newRole 
        }, { 
          onConflict: 'user_id' 
        })
        .select();

      if (error) {
        console.error('Supabase error updating user role:', error);
        toastHelpers.error('Failed to update user role', error);
        return;
      }

      console.log('Role update successful:', data);
      toastHelpers.success('User role updated successfully');
      fetchUsers(); // Refresh the list
    } catch (error) {
      console.error('Unexpected error updating user role:', error);
      toastHelpers.error('An unexpected error occurred while updating the user role', error);
    }
  };

  const filteredUsers = users.filter(user => {
    const searchString = `${user.email} ${user.profiles?.first_name || ''} ${user.profiles?.last_name || ''}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  });

  const getRoleBadgeVariant = (role?: UserRole) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'manager': return 'default';
      case 'supervisor': return 'secondary';
      case 'gds_expert': return 'outline';
      case 'agent': return 'secondary';
      case 'user': return 'outline';
      default: return 'outline';
    }
  };

  const getRoleDescription = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'Full system access and user management';
      case 'manager': return 'Team management and oversight';
      case 'supervisor': return 'Team supervision and quality control';
      case 'gds_expert': return 'Specialized booking system expertise';
      case 'agent': return 'Customer service and booking assistance';
      case 'user': return 'Basic system access';
      default: return 'No role assigned';
    }
  };

  if (authLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!user || !['supervisor', 'manager', 'admin'].includes(selectedViewRole || '')) {
    console.log('User role access denied:', { user: !!user, selectedViewRole, allowedRoles: ['supervisor', 'manager', 'admin'] });
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="w-8 h-8" />
            User Management
          </h1>
          <p className="text-muted-foreground">
            Manage user accounts and permissions
          </p>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={() => navigate('/teams')}
            variant="outline"
            className="flex items-center gap-2"
          >
            <UsersIcon className="h-4 w-4" />
            Teams
          </Button>
          <Dialog open={showAddUserDialog} onOpenChange={setShowAddUserDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Add a new user to the system with their role and permissions.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUserData.email}
                  onChange={(e) => {
                    setNewUserData(prev => ({ ...prev, email: e.target.value }));
                    validateEmail(e.target.value);
                  }}
                  placeholder="user@example.com"
                  className={!emailValid && newUserData.email ? 'border-destructive' : ''}
                />
                {!emailValid && newUserData.email && (
                  <p className="text-sm text-destructive">Please enter a valid email address</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={newUserData.password}
                  onChange={(e) => {
                    setNewUserData(prev => ({ ...prev, password: e.target.value }));
                    calculatePasswordStrength(e.target.value);
                  }}
                  placeholder="Temporary password"
                />
                {newUserData.password && (
                  <div className="space-y-1">
                    <div className="flex space-x-1">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded ${
                            i < passwordStrength ? 'bg-primary' : 'bg-muted'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Password strength: {['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'][passwordStrength]}
                    </p>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={newUserData.firstName}
                    onChange={(e) => setNewUserData(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="John"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={newUserData.lastName}
                    onChange={(e) => setNewUserData(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Doe"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={newUserData.company}
                    onChange={(e) => setNewUserData(prev => ({ ...prev, company: e.target.value }))}
                    placeholder="Company name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={newUserData.phone}
                    onChange={(e) => setNewUserData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select value={newUserData.role} onValueChange={(value: UserRole) => setNewUserData(prev => ({ ...prev, role: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">
                      <div className="flex flex-col">
                        <span>User</span>
                        <span className="text-xs text-muted-foreground">Basic system access</span>
                      </div>
                    </SelectItem>
                    {(selectedViewRole === 'admin' || selectedViewRole === 'manager' || selectedViewRole === 'supervisor') && (
                      <>
                        <SelectItem value="agent">
                          <div className="flex flex-col">
                            <span>Agent</span>
                            <span className="text-xs text-muted-foreground">Customer service and booking assistance</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="gds_expert">
                          <div className="flex flex-col">
                            <span>GDS Expert</span>
                            <span className="text-xs text-muted-foreground">Specialized booking system expertise</span>
                          </div>
                        </SelectItem>
                      </>
                    )}
                    {(selectedViewRole === 'admin' || selectedViewRole === 'manager') && (
                      <SelectItem value="supervisor">
                        <div className="flex flex-col">
                          <span>Supervisor</span>
                          <span className="text-xs text-muted-foreground">Team supervision and quality control</span>
                        </div>
                      </SelectItem>
                    )}
                    {selectedViewRole === 'admin' && (
                      <SelectItem value="manager">
                        <div className="flex flex-col">
                          <span>Manager</span>
                          <span className="text-xs text-muted-foreground">Team management and oversight</span>
                        </div>
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {getRoleDescription(newUserData.role)}
                </p>
              </div>
              <Button onClick={createUser} className="w-full">
                Create User
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>System Users ({filteredUsers.length})</CardTitle>
          <CardDescription>
            Manage user accounts, roles, and permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((userData) => (
                <TableRow 
                  key={userData.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => navigate(`/users/${userData.id}`)}
                >
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-medium text-sm">
                        {getUserInitials(userData)}
                      </div>
                      <div>
                        <p className="font-medium">{getDisplayName(userData)}</p>
                        <p className="text-sm text-muted-foreground">{userData.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="text-sm">{userData.email}</p>
                      {userData.profiles?.phone && (
                        <p className="text-sm text-muted-foreground">{userData.profiles.phone}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="text-sm">{userData.profiles?.company || '-'}</p>
                      {(userData as any).teams?.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Teams: {(userData as any).teams.map((t: any) => t.teams.name).join(', ')}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(userData.user_roles?.[0]?.role)}>
                      {userData.user_roles?.[0]?.role || 'No role'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Badge variant="outline" className="text-xs">
                        Active
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        Joined {new Date(userData.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                      <Select
                        value={userData.user_roles?.[0]?.role || 'user'}
                        onValueChange={(value: UserRole) => updateUserRole(userData.id, value)}
                      >
                        <SelectTrigger className="w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          {(selectedViewRole === 'admin' || selectedViewRole === 'manager' || selectedViewRole === 'supervisor') && (
                            <>
                              <SelectItem value="agent">Agent</SelectItem>
                              <SelectItem value="gds_expert">GDS Expert</SelectItem>
                            </>
                          )}
                          {(selectedViewRole === 'admin' || selectedViewRole === 'manager') && (
                            <SelectItem value="supervisor">Supervisor</SelectItem>
                          )}
                          {selectedViewRole === 'admin' && (
                            <>
                              <SelectItem value="manager">Manager</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredUsers.length === 0 && (
            <div className="text-center py-8">
              <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No users found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Users;
