import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DollarSign, TrendingUp, MapPin, Package, AlertCircle, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ManagerMetrics {
  total_profit: number;
  profit_change: number;
  team_profits: Array<{
    team_name: string;
    profit: number;
    members: number;
  }>;
  top_destinations: Array<{
    destination: string;
    bookings: number;
    revenue: number;
  }>;
  top_products: Array<{
    product: string;
    sales: number;
    revenue: number;
  }>;
  low_profit_teams: Array<{
    team_name: string;
    profit: number;
    target: number;
  }>;
}

export const ManagerDashboard = () => {
  const [metrics, setMetrics] = useState<ManagerMetrics>({
    total_profit: 0,
    profit_change: 0,
    team_profits: [],
    top_destinations: [],
    top_products: [],
    low_profit_teams: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        // Fetch all bookings for profit calculation
        const { data: bookings } = await supabase
          .from('bookings')
          .select('total_price, commission, route, created_at, user_id, class')
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

        // Fetch user roles to calculate team composition
        const { data: userRoles } = await supabase
          .from('user_roles')
          .select('user_id, role');

        // Fetch user profiles for names
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name');

        const totalProfit = bookings?.reduce((sum, booking) => sum + (booking.commission || 0), 0) || 0;
        
        // Calculate team profits based on user roles
        const teamProfits = [];
        const roleGroups = {
          sales_agent: { name: "Sales Team", target: 50000 },
          gds_expert: { name: "GDS Experts", target: 30000 },
          cs_agent: { name: "CS Team", target: 20000 }
        };

        for (const [role, config] of Object.entries(roleGroups)) {
          const teamMembers = userRoles?.filter(ur => ur.role === role) || [];
          const teamBookings = bookings?.filter(b => teamMembers.some(tm => tm.user_id === b.user_id)) || [];
          const teamProfit = teamBookings.reduce((sum, booking) => sum + (booking.commission || 0), 0);
          
          teamProfits.push({
            team_name: config.name,
            profit: teamProfit,
            members: teamMembers.length
          });
        }

        // Calculate top destinations from bookings
        const destinationMap = new Map();
        bookings?.forEach(booking => {
          const destinations = booking.route.split('-');
          destinations.forEach(dest => {
            const current = destinationMap.get(dest) || { bookings: 0, revenue: 0 };
            destinationMap.set(dest, {
              bookings: current.bookings + 1,
              revenue: current.revenue + (booking.total_price || 0)
            });
          });
        });

        const topDestinations = Array.from(destinationMap.entries())
          .map(([destination, data]) => ({ destination, ...data }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 4);

        // Calculate class distribution
        const classMap = new Map();
        bookings?.forEach(booking => {
          const current = classMap.get(booking.class || 'Economy') || { sales: 0, revenue: 0 };
          classMap.set(booking.class || 'Economy', {
            sales: current.sales + 1,
            revenue: current.revenue + (booking.total_price || 0)
          });
        });

        const topProducts = Array.from(classMap.entries())
          .map(([product, data]) => ({ product, ...data }))
          .sort((a, b) => b.revenue - a.revenue);

        // Identify low-performing teams
        const lowProfitTeams = teamProfits.filter(team => {
          const target = roleGroups[Object.keys(roleGroups).find(key => 
            roleGroups[key].name === team.team_name
          )]?.target || 25000;
          return team.profit < target * 0.8;
        }).map(team => ({
          ...team,
          target: roleGroups[Object.keys(roleGroups).find(key => 
            roleGroups[key].name === team.team_name
          )]?.target || 25000
        }));

        setMetrics({
          total_profit: totalProfit,
          profit_change: totalProfit > 0 ? 15.2 : -5.5, // Mock change calculation
          team_profits: teamProfits,
          top_destinations: topDestinations,
          top_products: topProducts,
          low_profit_teams: lowProfitTeams
        });
      } catch (error) {
        console.error('Error fetching manager metrics:', error);
        setMetrics({
          total_profit: 0,
          profit_change: 0,
          team_profits: [],
          top_destinations: [],
          top_products: [],
          low_profit_teams: []
        });
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 300000); // Refresh every 5 minutes

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Manager Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Manager Dashboard</h1>
        <Badge variant="default">
          Performance: {metrics.profit_change > 0 ? "Above Target" : "Below Target"}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.total_profit.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">last 30 days</p>
            <div className="flex items-center mt-2">
              <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              <span className="text-xs text-green-500">+{metrics.profit_change}% from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Performance</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.team_profits.length}</div>
            <p className="text-xs text-muted-foreground">active teams</p>
            <Progress value={85} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Destinations</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.top_destinations.length}</div>
            <p className="text-xs text-muted-foreground">trending routes</p>
            <span className="text-xs text-blue-500">London leading</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alerts</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.low_profit_teams.length}</div>
            <p className="text-xs text-muted-foreground">teams need attention</p>
            <Badge variant="destructive" className="mt-2">
              Action Required
            </Badge>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Team Profit Performance</CardTitle>
            <CardDescription>Monthly profit by team</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {metrics.team_profits.map((team, index) => (
              <div key={index} className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium">{team.team_name}</span>
                  <p className="text-xs text-muted-foreground">{team.members} members</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold">${team.profit.toLocaleString()}</span>
                  <Progress value={(team.profit / 50000) * 100} className="w-20 mt-1" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Destinations</CardTitle>
            <CardDescription>Most popular travel destinations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {metrics.top_destinations.map((dest, index) => (
              <div key={index} className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium">{dest.destination}</span>
                  <p className="text-xs text-muted-foreground">{dest.bookings} bookings</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold">${dest.revenue.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {metrics.low_profit_teams.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertCircle className="h-4 w-4 mr-2 text-red-500" />
              Teams Requiring Attention
            </CardTitle>
            <CardDescription>Teams below profit targets</CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.low_profit_teams.map((team, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div>
                  <span className="text-sm font-medium">{team.team_name}</span>
                  <p className="text-xs text-muted-foreground">
                    ${team.profit.toLocaleString()} / ${team.target.toLocaleString()} target
                  </p>
                </div>
                <Badge variant="destructive">
                  {Math.round((team.profit / team.target) * 100)}% of target
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};