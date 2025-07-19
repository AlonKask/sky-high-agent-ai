import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Search, Plus, MapPin, Users, Clock, Plane, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const RequestManager = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [isNewRequestDialogOpen, setIsNewRequestDialogOpen] = useState(false);
  const [requestType, setRequestType] = useState<string>("");
  const [departureDate, setDepartureDate] = useState<Date>();
  const [returnDate, setReturnDate] = useState<Date>();

  const activeRequests = [
    {
      id: "REQ-001",
      clientName: "Emma Wilson",
      clientId: "CL-004",
      type: "Round Trip",
      status: "quote_sent",
      priority: "high",
      createdDate: "2024-02-10",
      segments: [
        { from: "NYC", to: "DXB", date: "2024-03-10" },
        { from: "DXB", to: "NYC", date: "2024-03-17" }
      ],
      passengers: {
        adults: 2,
        children: 0,
        infants: 0
      },
      budget: "8000-12000",
      notes: "Anniversary trip, prefers Emirates",
      lastUpdated: "2024-02-12"
    },
    {
      id: "REQ-002",
      clientName: "David Brown",
      clientId: "CL-005",
      type: "Multi-City",
      status: "researching",
      priority: "medium",
      createdDate: "2024-02-08",
      segments: [
        { from: "LAX", to: "LHR", date: "2024-03-15" },
        { from: "LHR", to: "CDG", date: "2024-03-18" },
        { from: "CDG", to: "LAX", date: "2024-03-22" }
      ],
      passengers: {
        adults: 1,
        children: 1,
        infants: 0
      },
      budget: "15000-20000",
      notes: "Business trip with family, needs flexibility",
      lastUpdated: "2024-02-11"
    },
    {
      id: "REQ-003",
      clientName: "Lisa Anderson",
      clientId: "CL-006",
      type: "One Way",
      status: "pending_approval",
      priority: "low",
      createdDate: "2024-02-05",
      segments: [
        { from: "SFO", to: "NRT", date: "2024-04-01" }
      ],
      passengers: {
        adults: 1,
        children: 0,
        infants: 0
      },
      budget: "6000-8000",
      notes: "Relocation trip, cargo needs",
      lastUpdated: "2024-02-09"
    }
  ];

  const filteredRequests = activeRequests.filter(request =>
    request.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "quote_sent": return "bg-primary text-primary-foreground";
      case "researching": return "bg-warning text-warning-foreground";
      case "pending_approval": return "bg-muted text-muted-foreground";
      case "confirmed": return "bg-success text-success-foreground";
      case "cancelled": return "bg-destructive text-destructive-foreground";
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "Round Trip": return "⇄";
      case "One Way": return "→";
      case "Multi-City": return "↗";
      default: return "✈";
    }
  };

  const formatPassengers = (passengers: any) => {
    const parts = [];
    if (passengers.adults > 0) parts.push(`${passengers.adults} Adult${passengers.adults > 1 ? 's' : ''}`);
    if (passengers.children > 0) parts.push(`${passengers.children} Child${passengers.children > 1 ? 'ren' : ''}`);
    if (passengers.infants > 0) parts.push(`${passengers.infants} Infant${passengers.infants > 1 ? 's' : ''}`);
    return parts.join(', ');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Request Manager</h1>
          <p className="text-muted-foreground">Track and manage active client requests</p>
        </div>
        <Button onClick={() => setIsNewRequestDialogOpen(true)} className="bg-gradient-to-r from-primary to-primary-light">
          <Plus className="mr-2 h-4 w-4" />
          New Request
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search requests by client, ID, or type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="quote_sent">Quote Sent</SelectItem>
            <SelectItem value="researching">Researching</SelectItem>
            <SelectItem value="pending_approval">Pending Approval</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Request Cards */}
      <div className="grid gap-4">
        {filteredRequests.map((request) => (
          <Card key={request.id} className="border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setSelectedRequest(request)}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-accent/10">
                    <span className="text-lg">{getTypeIcon(request.type)}</span>
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-semibold">{request.clientName}</h3>
                      <Badge variant="outline" className="text-xs">{request.id}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">{request.type}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className={`text-xs ${getPriorityColor(request.priority)}`}>
                    {request.priority}
                  </Badge>
                  <Badge className={`text-xs ${getStatusColor(request.status)}`}>
                    {request.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>

              {/* Route Display */}
              <div className="mb-4">
                <div className="flex items-center space-x-2 text-sm">
                  {request.segments.map((segment, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium">{segment.from}</span>
                      </div>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium">{segment.to}</span>
                      </div>
                      <span className="text-muted-foreground">({segment.date})</span>
                      {index < request.segments.length - 1 && (
                        <div className="mx-2 text-muted-foreground">→</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Request Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{formatPassengers(request.passengers)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>Created: {request.createdDate}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-muted-foreground">Budget:</span>
                  <span className="font-medium">${request.budget}</span>
                </div>
              </div>

              {request.notes && (
                <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">{request.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Request Detail Dialog */}
      {selectedRequest && (
        <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Plane className="h-5 w-5" />
                <span>Request {selectedRequest.id}</span>
                <Badge className={`${getStatusColor(selectedRequest.status)}`}>
                  {selectedRequest.status.replace('_', ' ')}
                </Badge>
              </DialogTitle>
              <DialogDescription>
                Detailed view of client travel request
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Client Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div><strong>Client:</strong> {selectedRequest.clientName}</div>
                    <div><strong>Client ID:</strong> {selectedRequest.clientId}</div>
                    <div><strong>Request Type:</strong> {selectedRequest.type}</div>
                    <div><strong>Priority:</strong> 
                      <Badge className={`ml-2 text-xs ${getPriorityColor(selectedRequest.priority)}`}>
                        {selectedRequest.priority}
                      </Badge>
                    </div>
                    <div><strong>Created:</strong> {selectedRequest.createdDate}</div>
                    <div><strong>Last Updated:</strong> {selectedRequest.lastUpdated}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Travel Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selectedRequest.segments.map((segment, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center space-x-2">
                          <Plane className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{segment.from} → {segment.to}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">{segment.date}</span>
                      </div>
                    ))}
                    <div className="pt-2 border-t">
                      <div className="text-sm"><strong>Passengers:</strong> {formatPassengers(selectedRequest.passengers)}</div>
                      <div className="text-sm"><strong>Budget Range:</strong> ${selectedRequest.budget}</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Notes & Requirements</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{selectedRequest.notes}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button className="w-full" variant="outline">Send Quote</Button>
                    <Button className="w-full" variant="outline">Update Status</Button>
                    <Button className="w-full" variant="outline">Contact Client</Button>
                    <Button className="w-full bg-gradient-to-r from-primary to-primary-light">
                      Create Booking
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* New Request Dialog */}
      <Dialog open={isNewRequestDialogOpen} onOpenChange={setIsNewRequestDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Request</DialogTitle>
            <DialogDescription>
              Add a new travel request for a client
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Client</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CL-001">John Smith</SelectItem>
                    <SelectItem value="CL-002">Sarah Johnson</SelectItem>
                    <SelectItem value="CL-003">Michael Chen</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Request Type</Label>
                <Select value={requestType} onValueChange={setRequestType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one_way">One Way</SelectItem>
                    <SelectItem value="round_trip">Round Trip</SelectItem>
                    <SelectItem value="multi_city">Multi-City</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Route Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>From</Label>
                  <Input placeholder="NYC" />
                </div>
                <div className="space-y-2">
                  <Label>To</Label>
                  <Input placeholder="LHR" />
                </div>
                <div className="space-y-2">
                  <Label>Departure Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {departureDate ? format(departureDate, "PPP") : <span>Pick date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={departureDate}
                        onSelect={setDepartureDate}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {requestType === "round_trip" && (
                <div className="space-y-2">
                  <Label>Return Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {returnDate ? format(returnDate, "PPP") : <span>Pick return date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={returnDate}
                        onSelect={setReturnDate}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Passengers</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Adults</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="0" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4,5,6,7,8,9].map(num => (
                        <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Children</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="0" />
                    </SelectTrigger>
                    <SelectContent>
                      {[0,1,2,3,4,5,6,7,8,9].map(num => (
                        <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Infants</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="0" />
                    </SelectTrigger>
                    <SelectContent>
                      {[0,1,2,3,4,5,6,7,8,9].map(num => (
                        <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Budget Range</Label>
                <Input placeholder="e.g., 8000-12000" />
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="outline" onClick={() => setIsNewRequestDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-gradient-to-r from-primary to-primary-light">
              Create Request
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RequestManager;