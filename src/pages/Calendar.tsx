import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight, Filter, Download, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday, parseISO } from "date-fns";

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: 'departure' | 'arrival' | 'request' | 'meeting';
  client_name?: string;
  route?: string;
  status?: string;
  booking_id?: string;
  request_id?: string;
}

const Calendar = () => {
  const { user, loading } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"month" | "week">("month");

  useEffect(() => {
    if (user) {
      fetchCalendarEvents();
    }
  }, [user, currentDate]);

  const fetchCalendarEvents = async () => {
    if (!user) return;
    
    try {
      setLoadingEvents(true);
      
      // Get the start and end of the current month
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      
      // Fetch bookings for calendar events
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          departure_date,
          arrival_date,
          return_departure_date,
          return_arrival_date,
          route,
          status,
          clients!inner(first_name, last_name)
        `)
        .eq('user_id', user.id)
        .gte('departure_date', monthStart.toISOString())
        .lte('departure_date', monthEnd.toISOString());

      if (bookingsError) {
        console.error('Error fetching bookings:', bookingsError);
        toast.error('Failed to load calendar events');
        return;
      }

      // Fetch requests for calendar events
      const { data: requests, error: requestsError } = await supabase
        .from('requests')
        .select(`
          id,
          departure_date,
          return_date,
          origin,
          destination,
          status,
          clients!inner(first_name, last_name)
        `)
        .eq('user_id', user.id)
        .gte('departure_date', monthStart.toISOString().split('T')[0])
        .lte('departure_date', monthEnd.toISOString().split('T')[0]);

      if (requestsError) {
        console.error('Error fetching requests:', requestsError);
      }

      // Transform data into calendar events
      const calendarEvents: CalendarEvent[] = [];

      // Add booking events
      bookings?.forEach(booking => {
        // Departure event
        calendarEvents.push({
          id: `booking-dep-${booking.id}`,
          title: `Departure: ${booking.route}`,
          date: booking.departure_date,
          type: 'departure',
          client_name: `${booking.clients.first_name} ${booking.clients.last_name}`,
          route: booking.route,
          status: booking.status,
          booking_id: booking.id
        });

        // Arrival event
        calendarEvents.push({
          id: `booking-arr-${booking.id}`,
          title: `Arrival: ${booking.route}`,
          date: booking.arrival_date,
          type: 'arrival',
          client_name: `${booking.clients.first_name} ${booking.clients.last_name}`,
          route: booking.route,
          status: booking.status,
          booking_id: booking.id
        });

        // Return events if available
        if (booking.return_departure_date) {
          calendarEvents.push({
            id: `booking-ret-dep-${booking.id}`,
            title: `Return Departure: ${booking.route}`,
            date: booking.return_departure_date,
            type: 'departure',
            client_name: `${booking.clients.first_name} ${booking.clients.last_name}`,
            route: booking.route,
            status: booking.status,
            booking_id: booking.id
          });
        }

        if (booking.return_arrival_date) {
          calendarEvents.push({
            id: `booking-ret-arr-${booking.id}`,
            title: `Return Arrival: ${booking.route}`,
            date: booking.return_arrival_date,
            type: 'arrival',
            client_name: `${booking.clients.first_name} ${booking.clients.last_name}`,
            route: booking.route,
            status: booking.status,
            booking_id: booking.id
          });
        }
      });

      // Add request events
      requests?.forEach(request => {
        calendarEvents.push({
          id: `request-${request.id}`,
          title: `Travel Request: ${request.origin} → ${request.destination}`,
          date: request.departure_date,
          type: 'request',
          client_name: `${request.clients.first_name} ${request.clients.last_name}`,
          route: `${request.origin} → ${request.destination}`,
          status: request.status,
          request_id: request.id
        });
      });

      setEvents(calendarEvents);
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      toast.error('Failed to load calendar events');
    } finally {
      setLoadingEvents(false);
    }
  };

  const getDaysInMonth = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    return eachDayOfInterval({ start: monthStart, end: monthEnd });
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = parseISO(event.date.split('T')[0]);
      return isSameDay(eventDate, date);
    }).filter(event => {
      if (filterType === "all") return true;
      return event.type === filterType;
    });
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'departure': return 'bg-blue-500 text-white';
      case 'arrival': return 'bg-green-500 text-white';
      case 'request': return 'bg-orange-500 text-white';
      case 'meeting': return 'bg-purple-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'text-green-600';
      case 'pending': return 'text-orange-600';
      case 'cancelled': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const previousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const nextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const days = getDaysInMonth();

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Calendar</h1>
          <p className="text-muted-foreground">Manage your travel schedule and bookings</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              <SelectItem value="departure">Departures</SelectItem>
              <SelectItem value="arrival">Arrivals</SelectItem>
              <SelectItem value="request">Requests</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={goToToday}>
            Today
          </Button>
          
          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
          
          <Button variant="outline" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Navigation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" onClick={previousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-2xl font-semibold">
                {format(currentDate, 'MMMM yyyy')}
              </h2>
              <Button variant="outline" size="icon" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="animate-fade-in">
                {events.length} events this month
              </Badge>
              {loadingEvents && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 mb-4">
            {/* Week Headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                {day}
              </div>
            ))}
            
            {/* Calendar Days */}
            {days.map(day => {
              const dayEvents = getEventsForDate(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isTodayDate = isToday(day);
              
              return (
                <div
                  key={day.toISOString()}
                  className={`
                    min-h-[100px] p-2 border border-border rounded-lg transition-all hover:bg-accent/50 cursor-pointer
                    ${!isCurrentMonth ? 'opacity-50' : ''}
                    ${isTodayDate ? 'ring-2 ring-primary bg-primary/5' : ''}
                  `}
                >
                  <div className={`text-sm font-medium mb-1 ${isTodayDate ? 'text-primary' : ''}`}>
                    {format(day, 'd')}
                  </div>
                  
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map(event => (
                      <div
                        key={event.id}
                        className={`
                          text-xs px-2 py-1 rounded cursor-pointer transition-all hover:scale-105
                          ${getEventTypeColor(event.type)}
                        `}
                        onClick={() => setSelectedEvent(event)}
                      >
                        <div className="truncate font-medium">
                          {event.title}
                        </div>
                        {event.client_name && (
                          <div className="truncate opacity-90">
                            {event.client_name}
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {dayEvents.length > 3 && (
                      <div className="text-xs text-muted-foreground px-2">
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Event Details Dialog */}
      {selectedEvent && (
        <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Event Details
              </DialogTitle>
              <DialogDescription>
                {format(parseISO(selectedEvent.date), 'EEEE, MMMM d, yyyy')}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{selectedEvent.title}</h3>
                <Badge className={getEventTypeColor(selectedEvent.type)}>
                  {selectedEvent.type}
                </Badge>
              </div>
              
              {selectedEvent.client_name && (
                <div>
                  <span className="font-medium">Client:</span>
                  <p className="text-muted-foreground">{selectedEvent.client_name}</p>
                </div>
              )}
              
              {selectedEvent.route && (
                <div>
                  <span className="font-medium">Route:</span>
                  <p className="text-muted-foreground">{selectedEvent.route}</p>
                </div>
              )}
              
              {selectedEvent.status && (
                <div>
                  <span className="font-medium">Status:</span>
                  <p className={getStatusColor(selectedEvent.status)}>
                    {selectedEvent.status.charAt(0).toUpperCase() + selectedEvent.status.slice(1)}
                  </p>
                </div>
              )}
              
              <div className="flex gap-2 pt-4">
                {selectedEvent.booking_id && (
                  <Button 
                    variant="outline" 
                    onClick={() => window.open(`/booking/${selectedEvent.booking_id}`, '_blank')}
                  >
                    View Booking
                  </Button>
                )}
                {selectedEvent.request_id && (
                  <Button 
                    variant="outline"
                    onClick={() => window.open(`/request/${selectedEvent.request_id}`, '_blank')}
                  >
                    View Request
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Calendar;