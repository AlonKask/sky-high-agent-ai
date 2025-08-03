import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
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
  };
  user_roles?: {
    role: UserRole;
  }[];
}

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
    role: 'user' as UserRole
  });

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
          created_at
        `);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }

      console.log('Raw profiles data:', profilesData);

      // Fetch user roles separately
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (roleError) {
        console.error('Error fetching roles:', roleError);
        throw roleError;
      }

      console.log('Raw role data:', roleData);

      // Combine the data
      const usersWithRoles = profilesData?.map(user => ({
        id: user.id,
        email: user.email || 'No email',
        created_at: user.created_at,
        profiles: {
          first_name: user.first_name || '',
          last_name: user.last_name || '',
          company: user.company || ''
        },
        user_roles: roleData?.filter(r => r.user_id === user.id).map(r => ({ role: r.role as UserRole })) || []
      })) || [];

      console.log('Processed user data:', usersWithRoles);
      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const createUser = async () => {
    try {
      if (!newUserData.email || !newUserData.password || !newUserData.firstName || !newUserData.lastName || !newUserData.role) {
        toast.error('Please fill in all required fields');
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: newUserData.email,
          password: newUserData.password,
          firstName: newUserData.firstName,
          lastName: newUserData.lastName,
          role: newUserData.role,
          phone: newUserData.company || undefined,
          company: newUserData.company || undefined
        }
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to create user');
      }

      toast.success(`Successfully created user ${newUserData.firstName} ${newUserData.lastName}`);
      
      // Reset form
      setNewUserData({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        company: '',
        role: 'user' as UserRole
      });
      
      setShowAddUserDialog(false);
      fetchUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(error.message || 'Failed to create user');
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
        toast.error(`Failed to update user role: ${error.message}`);
        return;
      }

      console.log('Role update successful:', data);
      toast.success('User role updated successfully');
      fetchUsers(); // Refresh the list
    } catch (error) {
      console.error('Unexpected error updating user role:', error);
      toast.error('An unexpected error occurred while updating the user role');
    }
  };

  const filteredUsers = users.filter(user => {
    const searchString = `${user.email} ${user.profiles?.first_name || ''} ${user.profiles?.last_name || ''}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  });

  const getRoleBadgeColor = (role?: UserRole) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'manager': return 'bg-green-100 text-green-800';
      case 'supervisor': return 'bg-yellow-100 text-yellow-800';
      case 'gds_expert': return 'bg-indigo-100 text-indigo-800';
      case 'agent': return 'bg-blue-100 text-blue-800';
      case 'user': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
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
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUserData.email}
                  onChange={(e) => setNewUserData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="user@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={newUserData.password}
                  onChange={(e) => setNewUserData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Temporary password"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={newUserData.firstName}
                    onChange={(e) => setNewUserData(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="John"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={newUserData.lastName}
                    onChange={(e) => setNewUserData(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Doe"
                  />
                </div>
              </div>
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
                <Label htmlFor="role">Role</Label>
                <Select value={newUserData.role} onValueChange={(value: UserRole) => setNewUserData(prev => ({ ...prev, role: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
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
                      <SelectItem value="manager">Manager</SelectItem>
                    )}
                  </SelectContent>
                </Select>
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
                <TableHead>Email</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Created</TableHead>
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
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-4 h-4" />
                      </div>
                       <div>
                         <p className="font-medium">
                           {userData.profiles?.first_name || userData.profiles?.last_name 
                             ? `${userData.profiles?.first_name || ''} ${userData.profiles?.last_name || ''}`.trim()
                             : userData.email.split('@')[0]
                           }
                         </p>
                       </div>
                    </div>
                  </TableCell>
                  <TableCell>{userData.email}</TableCell>
                  <TableCell>{userData.profiles?.company || '-'}</TableCell>
                  <TableCell>
                    <Badge className={getRoleBadgeColor(userData.user_roles?.[0]?.role)}>
                      {userData.user_roles?.[0]?.role || 'No role'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(userData.created_at).toLocaleDateString()}
                  </TableCell>
                   <TableCell>
                     <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                       <Select
                         value={userData.user_roles?.[0]?.role || 'user'}
                         onValueChange={(value: UserRole) => updateUserRole(userData.id, value)}
                       >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="agent">Agent</SelectItem>
                          <SelectItem value="gds_expert">GDS Expert</SelectItem>
                          <SelectItem value="supervisor">Supervisor</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
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