import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plane, Calendar, Users, Plus, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const RequestDetail = () => {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sabreOptions, setSabreOptions] = useState<Array<{id: string, format: string, content: string}>>([]);
  const [newOptionContent, setNewOptionContent] = useState("");
  const [selectedFormat, setSelectedFormat] = useState<"I" | "VI">("I");

  // Mock request data - in real app this would come from API/database
  const request = {
    id: requestId,
    type: "Round Trip",
    status: "active",
    priority: "high",
    segments: [
      {
        from: "New York JFK",
        to: "London LHR", 
        date: "2024-03-20",
        passengers: { adults: 2, children: 0, infants: 0 }
      },
      {
        from: "London LHR",
        to: "New York JFK",
        date: "2024-03-27",
        passengers: { adults: 2, children: 0, infants: 0 }
      }
    ],
    clientName: "John Smith",
    requestDate: "2024-01-15",
    notes: "Business class preferred, vegetarian meals"
  };

  const addSabreOption = () => {
    if (!newOptionContent.trim()) return;
    
    const newOption = {
      id: `OPT-${Date.now()}`,
      format: selectedFormat,
      content: newOptionContent
    };
    
    setSabreOptions([...sabreOptions, newOption]);
    setNewOptionContent("");
    
    toast({
      title: "Option Added",
      description: `Sabre ${selectedFormat} format option added successfully.`,
    });
  };

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: "Copied",
      description: "Option content copied to clipboard.",
    });
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
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Request Details</h1>
          <p className="text-muted-foreground">Complete information for request {requestId}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
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
                  <div className="text-muted-foreground">{request.clientName}</div>
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

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sabre Options</CardTitle>
              <CardDescription>Add flight options in Sabre I or VI format</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs value={selectedFormat} onValueChange={(value) => setSelectedFormat(value as "I" | "VI")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="I">I Format</TabsTrigger>
                  <TabsTrigger value="VI">VI Format</TabsTrigger>
                </TabsList>
                <TabsContent value="I" className="space-y-2">
                  <Label>Interactive Format (I)</Label>
                  <p className="text-xs text-muted-foreground">
                    Interactive format for flight availability and pricing
                  </p>
                </TabsContent>
                <TabsContent value="VI" className="space-y-2">
                  <Label>View Information Format (VI)</Label>
                  <p className="text-xs text-muted-foreground">
                    View information format for detailed flight data
                  </p>
                </TabsContent>
              </Tabs>

              <div className="space-y-2">
                <Label htmlFor="sabre-content">Sabre Command/Response</Label>
                <Textarea
                  id="sabre-content"
                  placeholder={`Enter Sabre ${selectedFormat} format content...`}
                  value={newOptionContent}
                  onChange={(e) => setNewOptionContent(e.target.value)}
                  rows={4}
                />
              </div>

              <Button 
                onClick={addSabreOption}
                className="w-full"
                disabled={!newOptionContent.trim()}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add {selectedFormat} Option
              </Button>
            </CardContent>
          </Card>

          {sabreOptions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Added Options ({sabreOptions.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {sabreOptions.map((option) => (
                    <div key={option.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline">{option.format} Format</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(option.content)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="text-xs font-mono bg-muted p-2 rounded overflow-x-auto">
                        {option.content}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default RequestDetail;