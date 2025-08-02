import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, Calendar, DollarSign } from "lucide-react";

interface KPIData {
  totalRevenue: number;
  totalBookings: number;
  totalClients: number;
  conversionRate: number;
  avgTicketPrice: number;
  revenueGrowth: number;
}

interface AnalyticsKPICardsProps {
  data: KPIData;
  loading?: boolean;
}

export const AnalyticsKPICards = ({ data, loading }: AnalyticsKPICardsProps) => {
  const kpis = [
    {
      title: "Total Revenue",
      value: `$${data.totalRevenue?.toLocaleString() || '0'}`,
      icon: DollarSign,
      trend: data.revenueGrowth > 0 ? `+${data.revenueGrowth.toFixed(1)}%` : `${data.revenueGrowth.toFixed(1)}%`,
      trendUp: data.revenueGrowth > 0
    },
    {
      title: "Total Bookings",
      value: data.totalBookings?.toString() || '0',
      icon: Calendar,
      trend: "This period",
      trendUp: true
    },
    {
      title: "Active Clients",
      value: data.totalClients?.toString() || '0',
      icon: Users,
      trend: "Total clients",
      trendUp: true
    },
    {
      title: "Avg Ticket Price",
      value: `$${data.avgTicketPrice?.toLocaleString() || '0'}`,
      icon: TrendingUp,
      trend: `${data.conversionRate?.toFixed(1) || '0'}% conversion`,
      trendUp: data.conversionRate > 15
    }
  ];

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              <div className="h-4 w-4 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-muted animate-pulse rounded mb-1" />
              <div className="h-3 w-20 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi, index) => {
        const Icon = kpi.icon;
        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {kpi.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
              <p className={`text-xs ${kpi.trendUp ? 'text-green-600' : 'text-red-600'}`}>
                {kpi.trend}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};