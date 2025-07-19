import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plane, Calendar, Users, DollarSign, MapPin } from "lucide-react";

const BookingDetail = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();

  // Mock booking data - in real app this would come from API/database
  const booking = {
    id: bookingId,
    destination: "Paris",
    date: "2024-01-15",
    price: 8500,
    type: "business",
    itinerary: [
      { from: "New York JFK", to: "Paris CDG", date: "2024-01-15", time: "22:30", flight: "AF007" },
      { from: "Paris CDG", to: "New York JFK", date: "2024-01-22", time: "14:15", flight: "AF006" }
    ],
    passengers: [
      { name: "John Smith", type: "adult", seat: "2A" }
    ],
    productType: "published",
    requestSummary: "Client requested business class seats with vegetarian meals and aisle preference.",
    bookingDate: "2023-12-20",
    status: "completed"
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Booking Details</h1>
          <p className="text-muted-foreground">Complete information for booking {bookingId}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Plane className="h-5 w-5" />
              <span>Flight Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Booking ID:</span>
              <Badge variant="outline">{booking.id}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Status:</span>
              <Badge className="bg-success text-success-foreground">{booking.status}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Product Type:</span>
              <Badge variant="secondary">{booking.productType}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Total Price:</span>
              <span className="text-xl font-bold text-accent">${booking.price.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Passengers</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {booking.passengers.map((passenger, index) => (
              <div key={index} className="flex justify-between items-center p-3 border rounded mb-2">
                <div>
                  <div className="font-medium">{passenger.name}</div>
                  <div className="text-sm text-muted-foreground">{passenger.type}</div>
                </div>
                <Badge variant="outline">Seat {passenger.seat}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="h-5 w-5" />
              <span>Itinerary</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {booking.itinerary.map((segment, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{segment.date}</span>
                    </div>
                    <Badge variant="outline">{segment.flight}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-lg">{segment.from}</div>
                    <div className="flex items-center space-x-2">
                      <div className="h-px bg-border flex-1 w-8"></div>
                      <Plane className="h-4 w-4 text-muted-foreground" />
                      <div className="h-px bg-border flex-1 w-8"></div>
                    </div>
                    <div className="text-lg">{segment.to}</div>
                  </div>
                  <div className="text-center text-sm text-muted-foreground mt-2">
                    Departure: {segment.time}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Request Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{booking.requestSummary}</p>
            <div className="mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Booking Date: {booking.bookingDate}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BookingDetail;