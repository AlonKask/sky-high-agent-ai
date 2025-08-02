import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Users, Search, Edit, Trash2, UserPlus, UserMinus, Crown } from 'lucide-react';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface Team {
  id: string;
  name: string;
  description: string | null;
  manager_id: string | null;
  created_at: string;
  updated_at: string;
  manager?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  member_count?: number;
}

interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role_in_team: string;
  joined_at: string;
  user?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}

export const Teams = () => {
  const { user } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const { toast } = useToast();

  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isTeamDetailOpen, setIsTeamDetailOpen] = useState(false);
  const [newTeam, setNewTeam] = useState({ name: '', description: '', manager_id: '' });
  const [editTeam, setEditTeam] = useState({ name: '', description: '', manager_id: '' });

  const canManageTeams = role === 'admin' || role === 'manager' || role === 'supervisor';

  useEffect(() => {
    if (user && role) {
      fetchTeams();
      fetchAvailableUsers();
    }
  }, [user, role]);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      // Fetch teams first
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .order('created_at', { ascending: false });

      if (teamsError) throw teamsError;

      // Then fetch manager profiles and member counts separately
      const teamsWithDetails = await Promise.all(
        (teamsData || []).map(async (team) => {
          let manager = null;
          if (team.manager_id) {
            const { data: managerData } = await supabase
              .from('profiles')
              .select('first_name, last_name, email')
              .eq('id', team.manager_id)
              .single();
            manager = managerData;
          }

          const { count } = await supabase
            .from('team_members')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', team.id);

          return {
            ...team,
            manager,
            member_count: count || 0
          };
        })
      );

      setTeams(teamsWithDetails);
    } catch (error) {
      console.error('Error fetching teams:', error);
      toast({
        title: "Error",
        description: "Failed to fetch teams",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name')
        .order('first_name');

      if (error) throw error;
      setAvailableUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchTeamMembers = async (teamId: string) => {
    try {
      const { data: membersData, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_id', teamId)
        .order('joined_at');

      if (error) throw error;

      // Fetch user profiles separately
      const membersWithUsers = await Promise.all(
        (membersData || []).map(async (member) => {
          const { data: userData } = await supabase
            .from('profiles')
            .select('first_name, last_name, email')
            .eq('id', member.user_id)
            .single();

          return {
            ...member,
            user: userData
          };
        })
      );

      setTeamMembers(membersWithUsers);
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  };

  const createTeam = async () => {
    if (!newTeam.name.trim()) {
      toast({
        title: "Error",
        description: "Team name is required",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('Creating team with data:', {
        name: newTeam.name,
        description: newTeam.description || null,
        manager_id: newTeam.manager_id || null
      });

      const { data, error } = await supabase
        .from('teams')
        .insert([{
          name: newTeam.name,
          description: newTeam.description || null,
          manager_id: newTeam.manager_id || null
        }])
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Team created successfully:', data);

      toast({
        title: "Success",
        description: "Team created successfully"
      });

      setIsCreateDialogOpen(false);
      setNewTeam({ name: '', description: '', manager_id: '' });
      fetchTeams();
    } catch (error: any) {
      console.error('Error creating team:', error);
      const errorMessage = error?.message || 'Failed to create team';
      toast({
        title: "Error",
        description: `Failed to create team: ${errorMessage}`,
        variant: "destructive"
      });
    }
  };

  const updateTeam = async () => {
    if (!selectedTeam) return;

    try {
      const { error } = await supabase
        .from('teams')
        .update({
          name: editTeam.name,
          description: editTeam.description || null,
          manager_id: editTeam.manager_id || null
        })
        .eq('id', selectedTeam.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Team updated successfully"
      });

      setIsEditDialogOpen(false);
      fetchTeams();
    } catch (error) {
      console.error('Error updating team:', error);
      toast({
        title: "Error",
        description: "Failed to update team",
        variant: "destructive"
      });
    }
  };

  const deleteTeam = async (teamId: string) => {
    try {
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Team deleted successfully"
      });

      fetchTeams();
    } catch (error) {
      console.error('Error deleting team:', error);
      toast({
        title: "Error",
        description: "Failed to delete team",
        variant: "destructive"
      });
    }
  };

  const addUserToTeam = async (userId: string, roleInTeam: string = 'member') => {
    if (!selectedTeam) return;

    try {
      const { error } = await supabase
        .from('team_members')
        .insert([{
          team_id: selectedTeam.id,
          user_id: userId,
          role_in_team: roleInTeam
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User added to team successfully"
      });

      fetchTeamMembers(selectedTeam.id);
      fetchTeams();
    } catch (error) {
      console.error('Error adding user to team:', error);
      toast({
        title: "Error",
        description: "Failed to add user to team",
        variant: "destructive"
      });
    }
  };

  const removeUserFromTeam = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User removed from team successfully"
      });

      if (selectedTeam) {
        fetchTeamMembers(selectedTeam.id);
        fetchTeams();
      }
    } catch (error) {
      console.error('Error removing user from team:', error);
      toast({
        title: "Error",
        description: "Failed to remove user from team",
        variant: "destructive"
      });
    }
  };

  const openTeamDetail = (team: Team) => {
    setSelectedTeam(team);
    setIsTeamDetailOpen(true);
    fetchTeamMembers(team.id);
  };

  const openEditDialog = (team: Team) => {
    setSelectedTeam(team);
    setEditTeam({
      name: team.name,
      description: team.description || '',
      manager_id: team.manager_id || ''
    });
    setIsEditDialogOpen(true);
  };

  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (roleLoading || loading) {
    return <LoadingSpinner />;
  }

  if (!canManageTeams && role !== 'agent' && role !== 'user') {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">You don't have permission to view teams.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Teams</h1>
          <p className="text-muted-foreground">Manage teams and their members</p>
        </div>
        {canManageTeams && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Team
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Team</DialogTitle>
                <DialogDescription>
                  Create a new team to organize your users.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Team Name</Label>
                  <Input
                    id="name"
                    value={newTeam.name}
                    onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                    placeholder="Enter team name"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newTeam.description}
                    onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
                    placeholder="Enter team description"
                  />
                </div>
                <div>
                  <Label htmlFor="manager">Team Manager</Label>
                  <Select value={newTeam.manager_id} onValueChange={(value) => setNewTeam({ ...newTeam, manager_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a manager" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.first_name} {user.last_name} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={createTeam} disabled={!newTeam.name}>
                  Create Team
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search teams..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredTeams.map((team) => (
          <Card key={team.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openTeamDetail(team)}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {team.name}
                </CardTitle>
                {canManageTeams && (
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" onClick={() => openEditDialog(team)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Team</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this team? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteTeam(team.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
              <CardDescription>{team.description || 'No description'}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Members:</span>
                  <Badge variant="secondary">{team.member_count || 0}</Badge>
                </div>
                {team.manager && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Manager:</span>
                    <span className="flex items-center gap-1">
                      <Crown className="h-3 w-3" />
                      {team.manager.first_name} {team.manager.last_name}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Team Detail Dialog */}
      <Dialog open={isTeamDetailOpen} onOpenChange={setIsTeamDetailOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {selectedTeam?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedTeam?.description || 'No description'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Team Members ({teamMembers.length})</h3>
              {canManageTeams && (
                <Select onValueChange={(userId) => addUserToTeam(userId)}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Add member to team" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers
                      .filter(user => !teamMembers.some(member => member.user_id === user.id))
                      .map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.first_name} {user.last_name} ({user.email})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role in Team</TableHead>
                  <TableHead>Joined</TableHead>
                  {canManageTeams && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      {member.user?.first_name} {member.user?.last_name}
                    </TableCell>
                    <TableCell>{member.user?.email}</TableCell>
                    <TableCell>
                      <Badge variant={member.role_in_team === 'lead' ? 'default' : 'secondary'}>
                        {member.role_in_team}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(member.joined_at).toLocaleDateString()}</TableCell>
                    {canManageTeams && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeUserFromTeam(member.id)}
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Team Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Team</DialogTitle>
            <DialogDescription>
              Update team information.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Team Name</Label>
              <Input
                id="edit-name"
                value={editTeam.name}
                onChange={(e) => setEditTeam({ ...editTeam, name: e.target.value })}
                placeholder="Enter team name"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editTeam.description}
                onChange={(e) => setEditTeam({ ...editTeam, description: e.target.value })}
                placeholder="Enter team description"
              />
            </div>
            <div>
              <Label htmlFor="edit-manager">Team Manager</Label>
              <Select value={editTeam.manager_id} onValueChange={(value) => setEditTeam({ ...editTeam, manager_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a manager" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.first_name} {user.last_name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={updateTeam} disabled={!editTeam.name}>
              Update Team
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};