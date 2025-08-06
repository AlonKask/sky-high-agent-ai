import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toastHelpers } from "@/utils/toastHelpers";
import { Search, Plane, MapPin, Calendar, User, DollarSign, Clock, FileText } from "lucide-react";

interface Booking {
  id: string;
  user_id: string;
  client_id: string;
  departure_date: string;
  arrival_date: string;
  return_departure_date?: string;
  return_arrival_date?: string;
  passengers: number;
  total_price: number;
  commission?: number;
  class: string;
  route: string;
  status: string;
  payment_status: string;
  airline: string;
  booking_reference: string;
  pnr?: string;
  created_at: string;
  clients?: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    client_type: string;
  };
}

const EnhancedBookingManager = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { role } = useUserRole();
  const [searchParams, setSearchParams] = useSearchParams();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const filterUserId = searchParams.get('user');

  useEffect(() => {
    if (user) {
      fetchBookings();
    }
  }, [user]);

  const fetchBookings = async () => {
    if (!user) return;
    
    try {
      setLoading(true);

      let query = supabase
        .from('bookings')
        .select(`
          *,
          clients!inner(
            first_name,
            last_name,
            email,
            phone,
            client_type
          )
        `)
        .order('created_at', { ascending: false });

      // Apply user filtering for regular users or when user filter is specified
      if (filterUserId) {
        query = query.eq('user_id', filterUserId);
      } else if (role === 'user' || role === 'agent') {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching bookings:', error);
        toastHelpers.error('Failed to load bookings', error);
        return;
      }

      setBookings(data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toastHelpers.error('Failed to load bookings', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = (
      `${booking.clients?.first_name} ${booking.clients?.last_name}` +
      booking.route + booking.airline + booking.booking_reference
    ).toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = filterStatus === "all" || booking.status === filterStatus;

    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed": return "bg-green-500 text-white";
      case "pending": return "bg-orange-500 text-white";
      case "cancelled": return "bg-red-500 text-white";
      case "completed": return "bg-blue-500 text-white";
      default: return "bg-gray-500 text-white";
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "paid": return "bg-green-100 text-green-800";
      case "pending": return "bg-orange-100 text-orange-800";
      case "overdue": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const BookingCard = ({ booking }: { booking: Booking }) => (
    <Card 
      className="card-elevated hover:shadow-large transition-all duration-200 cursor-pointer"
      onClick={() => navigate(`/bookings/${booking.id}`)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Plane className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">
                {booking.clients?.first_name} {booking.clients?.last_name}
              </CardTitle>
              <CardDescription className="text-sm">
                {booking.booking_reference} - {booking.airline}
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge className={getStatusColor(booking.status)}>
              {booking.status}
            </Badge>
            <Badge variant="outline" className={getPaymentStatusColor(booking.payment_status)}>
              {booking.payment_status}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>{booking.route}</span>
          </div>
          <div className="text-right">
            <div className="font-bold text-lg text-green-600">
              ${booking.total_price.toLocaleString()}
            </div>
            {booking.commission && (
              <div className="text-xs text-muted-foreground">
                Commission: ${booking.commission.toLocaleString()}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>{new Date(booking.departure_date).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-1">
            <User className="w-4 h-4" />
            <span>{booking.passengers} passengers</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="capitalize">{booking.class}</span>
          </div>
        </div>

        {booking.pnr && (
          <div className="flex items-center gap-2 text-sm">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span className="font-mono text-muted-foreground">PNR: {booking.pnr}</span>
          </div>
        )}

        <div className="pt-2 border-t flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/bookings/${booking.id}`);
            }}
          >
            View Details
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={(e) => e.stopPropagation()}
          >
            Contact Client
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const statsCards = [
    {
      title: "Total Bookings",
      value: bookings.length,
      icon: Plane,
      color: "text-blue-600",
      bgColor: "bg-blue-100"
    },
    {
      title: "This Month Revenue",
      value: `$${bookings
        .filter(b => new Date(b.created_at).getMonth() === new Date().getMonth())
        .reduce((sum, b) => sum + b.total_price, 0)
        .toLocaleString()}`,
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-100"
    },
    {
      title: "Confirmed Bookings",
      value: bookings.filter(b => b.status === 'confirmed').length,
      icon: Clock,
      color: "text-orange-600",
      bgColor: "bg-orange-100"
    },
    {
      title: "Total Commission",
      value: `$${bookings
        .reduce((sum, b) => sum + (b.commission || 0), 0)
        .toLocaleString()}`,
      icon: DollarSign,
      color: "text-purple-600",
      bgColor: "bg-purple-100"
    }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Booking Management</h1>
        </div>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Booking Management</h1>
          <p className="text-muted-foreground">
            Track and manage all client bookings
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="card-elevated">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-full ${stat.bgColor} flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search bookings by client, route, airline..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full lg:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bookings Grid */}
      {filteredBookings.length === 0 ? (
        <Card className="p-12 text-center">
          <Plane className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No bookings found</h3>
          <p className="text-muted-foreground">
            {searchTerm || filterStatus !== "all" 
              ? "Try adjusting your search or filters" 
              : "Start by creating your first booking"}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredBookings.map((booking) => (
            <BookingCard key={booking.id} booking={booking} />
          ))}
        </div>
      )}
    </div>
  );
};

export default EnhancedBookingManager;