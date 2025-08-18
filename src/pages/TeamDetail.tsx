import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Users, TrendingUp, DollarSign, Calendar, UserPlus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useTeamDetail } from "@/hooks/useTeamDetail";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { format } from "date-fns";

const TeamDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { role } = useUserRole();
  const { data: teamData, loading, error } = useTeamDetail(id!);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error || !teamData) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Team not found</h2>
          <p className="text-muted-foreground mb-4">{error || "The team you're looking for doesn't exist."}</p>
          <Button onClick={() => navigate("/teams")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Teams
          </Button>
        </div>
      </div>
    );
  }

  const canManageTeam = role && ['admin', 'manager', 'supervisor'].includes(role);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate("/teams")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Teams
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{teamData.team.name}</h1>
            <p className="text-muted-foreground">{teamData.team.description}</p>
          </div>
        </div>
        {canManageTeam && (
          <Button onClick={() => navigate(`/teams/${id}/edit`)}>
            Edit Team
          </Button>
        )}
      </div>

      {/* Team Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamData.members.length}</div>
            <p className="text-xs text-muted-foreground">
              Active team members
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${teamData.analytics?.totalRevenue?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {teamData.analytics?.totalBookings || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Requests</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {teamData.analytics?.activeRequests || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Pending requests
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Team Manager */}
      <Card>
        <CardHeader>
          <CardTitle>Team Manager</CardTitle>
          <CardDescription>Current team manager and contact information</CardDescription>
        </CardHeader>
        <CardContent>
          {teamData.manager ? (
            <div className="flex items-center space-x-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={teamData.manager.avatar_url || undefined} />
                <AvatarFallback>
                  {teamData.manager.first_name?.[0]}{teamData.manager.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">
                  {teamData.manager.first_name} {teamData.manager.last_name}
                </p>
                <p className="text-sm text-muted-foreground">{teamData.manager.email}</p>
              </div>
              <Badge variant="secondary">Manager</Badge>
            </div>
          ) : (
            <p className="text-muted-foreground">No manager assigned</p>
          )}
        </CardContent>
      </Card>

      {/* Team Members */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>All team members and their roles</CardDescription>
          </div>
          {canManageTeam && (
            <Button size="sm">
              <UserPlus className="w-4 h-4 mr-2" />
              Add Member
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {teamData.members.map((member) => (
              <div key={member.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Avatar>
                    <AvatarImage src={member.user?.avatar_url || undefined} />
                    <AvatarFallback>
                      {member.user?.first_name?.[0]}{member.user?.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {member.user?.first_name} {member.user?.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">{member.user?.email}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={member.role === 'manager' ? 'default' : 'secondary'}>
                    {member.role}
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    Joined {format(new Date(member.created_at), 'MMM yyyy')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Team Performance Analytics */}
      {teamData.analytics && (
        <Card>
          <CardHeader>
            <CardTitle>Team Performance</CardTitle>
            <CardDescription>Key performance metrics for this team</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold">
                  {teamData.analytics.conversionRate?.toFixed(1) || '0'}%
                </div>
                <p className="text-sm text-muted-foreground">Conversion Rate</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold">
                  ${teamData.analytics.avgTicketPrice?.toLocaleString() || '0'}
                </div>
                <p className="text-sm text-muted-foreground">Avg Ticket Price</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold">
                  {teamData.analytics.totalClients || 0}
                </div>
                <p className="text-sm text-muted-foreground">Total Clients</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TeamDetail;