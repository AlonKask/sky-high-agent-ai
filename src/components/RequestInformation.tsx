
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Users, Plane, MapPin, ArrowRight, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface RequestInformationProps {
  request: {
    id: string;
    type: string;
    status: string;
    priority: string;
    segments: Array<{
      from: string;
      to: string;
      date: string;
      passengers: { adults: number; children: number; infants: number };
    }>;
    clientName: string;
    requestDate: string;
    notes?: string;
  };
}

const RequestInformation = ({ request }: RequestInformationProps) => {
  const navigate = useNavigate();
  
  const handleClientClick = () => {
    // Convert client name to a URL-friendly format
    const clientId = request.clientName.toLowerCase().replace(/\s+/g, '-');
    navigate(`/client/${clientId}`);
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-warning text-warning-foreground";
      case "pending": return "bg-muted text-muted-foreground";
      case "completed": return "bg-success text-success-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-destructive text-destructive-foreground";
      case "medium": return "bg-warning text-warning-foreground";
      case "low": return "bg-success text-success-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center space-x-2">
              <Plane className="h-5 w-5" />
              <span>Request Information</span>
            </span>
            <div className="flex space-x-2">
              <Badge className={getPriorityColor(request.priority)}>{request.priority}</Badge>
              <Badge className={getStatusColor(request.status)}>{request.status}</Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="font-medium">Request ID:</span>
              <div className="text-muted-foreground">{request.id}</div>
            </div>
            <div>
              <span className="font-medium">Type:</span>
              <div className="text-muted-foreground">{request.type}</div>
            </div>
            <div>
              <span className="font-medium">Client:</span>
              <div className="text-muted-foreground">
                <Button 
                  variant="link" 
                  className="p-0 h-auto font-normal text-muted-foreground hover:text-primary transition-colors"
                  onClick={handleClientClick}
                >
                  {request.clientName}
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>
            <div>
              <span className="font-medium">Request Date:</span>
              <div className="text-muted-foreground">{request.requestDate}</div>
            </div>
          </div>
          {request.notes && (
            <div>
              <span className="font-medium">Notes:</span>
              <div className="text-muted-foreground mt-1">{request.notes}</div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Flight Segments</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {request.segments.map((segment, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{segment.date}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {segment.passengers.adults}A
                      {segment.passengers.children > 0 && `, ${segment.passengers.children}C`}
                      {segment.passengers.infants > 0 && `, ${segment.passengers.infants}I`}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-lg font-medium">{segment.from}</div>
                  <div className="flex items-center space-x-2">
                    <div className="h-px bg-border flex-1 w-8"></div>
                    <Plane className="h-4 w-4 text-muted-foreground" />
                    <div className="h-px bg-border flex-1 w-8"></div>
                  </div>
                  <div className="text-lg font-medium">{segment.to}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RequestInformation;
