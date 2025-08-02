import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  Building, 
  Calendar,
  DollarSign,
  TrendingUp,
  Users,
  Star,
  Clock,
  Award
} from 'lucide-react';

interface UserProfileData {
  id: string;
  email: string;
  created_at: string;
  profiles?: {
    first_name?: string;
    last_name?: string;
    company?: string;
    phone?: string;
    avatar_url?: string;
  };
  user_roles?: {
    role: string;
  }[];
}

interface PerformanceData {
  total_bookings: number;
  total_revenue: number;
  total_commission: number;
  conversion_rate: number;
  client_satisfaction_score: number;
  avg_response_time?: string;
}

const UserProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { role } = useUserRole();
  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchUserProfile();
      fetchPerformanceData();
    }
  }, [id]);

  const fetchUserProfile = async () => {
    try {
      // Fetch user profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          first_name,
          last_name,
          company,
          phone,
          avatar_url,
          created_at
        `)
        .eq('id', id)
        .single();

      if (profileError) throw profileError;

      // Fetch user role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', id);

      if (roleError) throw roleError;

      setProfileData({
        id: profileData.id,
        email: profileData.email || 'No email',
        created_at: profileData.created_at,
        profiles: {
          first_name: profileData.first_name,
          last_name: profileData.last_name,
          company: profileData.company,
          phone: profileData.phone,
          avatar_url: profileData.avatar_url,
        },
        user_roles: roleData?.map(r => ({ role: r.role })) || []
      });

    } catch (error) {
      console.error('Error fetching user profile:', error);
      toast.error('Failed to load user profile');
    }
  };

  const fetchPerformanceData = async () => {
    try {
      // Fetch booking statistics
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('total_price, commission')
        .eq('user_id', id);

      if (bookingsError) throw bookingsError;

      // Fetch performance reports if available
      const { data: performanceReports, error: performanceError } = await supabase
        .from('agent_performance_reports')
        .select('*')
        .eq('agent_id', id)
        .order('created_at', { ascending: false })
        .limit(1);

      // Calculate basic metrics from bookings
      const totalBookings = bookingsData?.length || 0;
      const totalRevenue = bookingsData?.reduce((sum, booking) => sum + (booking.total_price || 0), 0) || 0;
      const totalCommission = bookingsData?.reduce((sum, booking) => sum + (booking.commission || 0), 0) || 0;

      // Use performance report data if available, otherwise use calculated data
      const latestReport = performanceReports?.[0];
      
      setPerformanceData({
        total_bookings: latestReport?.total_bookings || totalBookings,
        total_revenue: latestReport?.total_revenue || totalRevenue,
        total_commission: latestReport?.total_commission || totalCommission,
        conversion_rate: latestReport?.conversion_rate || 0,
        client_satisfaction_score: latestReport?.client_satisfaction_score || 0,
        avg_response_time: latestReport?.avg_response_time?.toString() || undefined
      });

    } catch (error) {
      console.error('Error fetching performance data:', error);
      // Set default values if performance data fails to load
      setPerformanceData({
        total_bookings: 0,
        total_revenue: 0,
        total_commission: 0,
        conversion_rate: 0,
        client_satisfaction_score: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const getDisplayName = () => {
    if (profileData?.profiles?.first_name || profileData?.profiles?.last_name) {
      return `${profileData.profiles.first_name || ''} ${profileData.profiles.last_name || ''}`.trim();
    }
    return profileData?.email?.split('@')[0] || 'Unknown User';
  };

  const getCompanyTenure = () => {
    if (!profileData?.created_at) return 'Unknown';
    const joinDate = new Date(profileData.created_at);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - joinDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) return `${diffDays} days`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months`;
    return `${Math.floor(diffDays / 365)} years`;
  };

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 border-red-200';
      case 'manager': return 'bg-green-100 text-green-800 border-green-200';
      case 'supervisor': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'gds_expert': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'agent': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'user': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const canViewProfile = () => {
    // Users can view their own profile, or if they have supervisor+ role
    return user?.id === id || ['admin', 'manager', 'supervisor'].includes(role || '');
  };

  if (!canViewProfile()) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">You don't have permission to view this profile.</p>
            <Button onClick={() => navigate('/users')} className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Users
            </Button>
          </CardContent>
        </Card>
      </div>
    );
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

  if (!profileData) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">User not found.</p>
            <Button onClick={() => navigate('/users')} className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Users
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => navigate('/users')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Users
        </Button>
      </div>

      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              {profileData.profiles?.avatar_url ? (
                <img 
                  src={profileData.profiles.avatar_url} 
                  alt="Profile" 
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <User className="w-10 h-10 text-primary" />
              )}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">{getDisplayName()}</h1>
                <Badge className={getRoleBadgeColor(profileData.user_roles?.[0]?.role)}>
                  {profileData.user_roles?.[0]?.role || 'No role'}
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  <span className="text-sm">{profileData.email}</span>
                </div>
                
                {profileData.profiles?.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span className="text-sm">{profileData.profiles.phone}</span>
                  </div>
                )}
                
                {profileData.profiles?.company && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building className="w-4 h-4" />
                    <span className="text-sm">{profileData.profiles.company}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">Joined {getCompanyTenure()} ago</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${performanceData?.total_revenue?.toLocaleString() || '0'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4" />
              Total Bookings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {performanceData?.total_bookings || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Total Commission
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${performanceData?.total_commission?.toLocaleString() || '0'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Star className="w-4 h-4" />
              Satisfaction Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {performanceData?.client_satisfaction_score?.toFixed(1) || '0.0'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Performance Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Performance Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Conversion Rate</span>
              <span className="font-medium">
                {performanceData?.conversion_rate?.toFixed(1) || '0.0'}%
              </span>
            </div>
            
            {performanceData?.avg_response_time && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Avg Response Time</span>
                <span className="font-medium">{performanceData.avg_response_time}</span>
              </div>
            )}

            <Separator />
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Time in Company</span>
              <span className="font-medium">{getCompanyTenure()}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Join Date</span>
              <span className="font-medium">
                {new Date(profileData.created_at).toLocaleDateString()}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">User ID</span>
              <span className="font-mono text-xs">{profileData.id}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Email Verified</span>
              <Badge variant="outline" className="text-green-600 border-green-200">
                Verified
              </Badge>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant="outline" className="text-green-600 border-green-200">
                Active
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UserProfile;