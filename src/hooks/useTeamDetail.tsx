import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useUserRole } from './useUserRole';

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: string;
  created_at: string;
  user?: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  manager_id?: string;
  created_at: string;
  updated_at: string;
}

export interface TeamAnalytics {
  totalRevenue: number;
  totalBookings: number;
  totalClients: number;
  activeRequests: number;
  conversionRate: number;
  avgTicketPrice: number;
}

export interface TeamDetailData {
  team: Team;
  members: TeamMember[];
  manager?: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
  analytics?: TeamAnalytics;
}

export const useTeamDetail = (teamId: string) => {
  const { user } = useAuth();
  const { role } = useUserRole();
  const [data, setData] = useState<TeamDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeamDetail = async () => {
    if (!user || !teamId) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Check if user can view this team
      if (!role || !['admin', 'manager', 'supervisor'].includes(role)) {
        throw new Error('Insufficient permissions to view team details');
      }

      // Fetch team basic information
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select(`
          id,
          name,
          description,
          manager_id,
          created_at,
          updated_at
        `)
        .eq('id', teamId)
        .single();

      if (teamError) {
        throw new Error(teamError.message || 'Failed to fetch team information');
      }

      if (!teamData) {
        throw new Error('Team not found');
      }

      // Fetch team members with their profile information
      const { data: membersData, error: membersError } = await supabase
        .from('team_members')
        .select(`
          id,
          team_id,
          user_id,
          role_in_team,
          joined_at
        `)
        .eq('team_id', teamId);


      // Fetch user profiles separately for team members
      const membersWithUsers = await Promise.all(
        (membersData || []).map(async (member) => {
          const { data: userData } = await supabase
            .from('profiles')
            .select('id, email, first_name, last_name, avatar_url')
            .eq('id', member.user_id)
            .single();

          return {
            ...member,
            role: member.role_in_team, // Map role_in_team to role for compatibility
            created_at: member.joined_at, // Map joined_at to created_at for compatibility
            user: userData
          };
        })
      );

      if (membersError) {
        throw new Error(membersError.message || 'Failed to fetch team members');
      }

      // Fetch manager information if manager_id exists
      let managerData = null;
      if (teamData.manager_id) {
        const { data: manager, error: managerError } = await supabase
          .from('profiles')
          .select('id, email, first_name, last_name, avatar_url')
          .eq('id', teamData.manager_id)
          .single();

        if (!managerError && manager) {
          managerData = manager;
        }
      }

      // Fetch team analytics using the team-analytics function
      let analyticsData = null;
      try {
        const { data: analytics, error: analyticsError } = await supabase.functions.invoke('team-analytics', {
          body: { 
            period: 'month', 
            role: role,
            metric: 'team-overview',
            teamId: teamId
          }
        });

        if (!analyticsError && analytics) {
          analyticsData = analytics;
        }
      } catch (analyticsError) {
        console.warn('Failed to fetch team analytics:', analyticsError);
        // Don't throw error for analytics - it's not critical
      }

      const teamDetailData: TeamDetailData = {
        team: teamData,
        members: membersWithUsers || [],
        manager: managerData,
        analytics: analyticsData
      };

      setData(teamDetailData);
    } catch (err) {
      console.error('Error fetching team detail:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch team details');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamDetail();
  }, [user, role, teamId]);

  return { 
    data, 
    loading, 
    error, 
    refetch: fetchTeamDetail 
  };
};