
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, Users, Plane, MapPin, ArrowRight, ExternalLink, Edit, Save, X, Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import SegmentCard from "./SegmentCard";

interface Segment {
  from: string;
  to: string;
  date: string;
  passengers: { adults: number; children: number; infants: number };
}

interface RequestInformationProps {
  request: {
    id: string;
    type: string;
    status: string;
    priority: string;
    segments: Segment[];
    clientName: string;
    requestDate: string;
    notes?: string;
  };
  onRequestUpdate?: (updatedRequest: any) => void;
}

const RequestInformation = ({ request, onRequestUpdate }: RequestInformationProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isEditingRequest, setIsEditingRequest] = useState(false);
  const [isEditingSegment, setIsEditingSegment] = useState<number | null>(null);
  const [isAddingSegment, setIsAddingSegment] = useState(false);
  const [editedRequest, setEditedRequest] = useState(request);
  const [newSegment, setNewSegment] = useState<Segment>({
    from: "",
    to: "",
    date: "",
    passengers: { adults: 1, children: 0, infants: 0 }
  });
  
  const handleClientClick = () => {
    const clientId = request.clientName.toLowerCase().replace(/\s+/g, '-');
    navigate(`/client/${clientId}`);
  };
  
  const handleSaveRequest = () => {
    onRequestUpdate?.(editedRequest);
    setIsEditingRequest(false);
    toast({
      title: "Request Updated",
      description: "Request information has been saved successfully."
    });
  };
  
  const handleSaveSegment = (index: number, updatedSegment: Segment) => {
    const updatedSegments = [...editedRequest.segments];
    updatedSegments[index] = updatedSegment;
    const updatedRequest = { ...editedRequest, segments: updatedSegments };
    setEditedRequest(updatedRequest);
    onRequestUpdate?.(updatedRequest);
    setIsEditingSegment(null);
    toast({
      title: "Segment Updated",
      description: "Flight segment has been updated successfully."
    });
  };
  
  const handleAddSegment = () => {
    if (!newSegment.from || !newSegment.to || !newSegment.date) {
      toast({
        title: "Error",
        description: "Please fill in all required segment fields.",
        variant: "destructive"
      });
      return;
    }
    
    const updatedSegments = [...editedRequest.segments, newSegment];
    const updatedRequest = { ...editedRequest, segments: updatedSegments };
    setEditedRequest(updatedRequest);
    onRequestUpdate?.(updatedRequest);
    setNewSegment({
      from: "",
      to: "",
      date: "",
      passengers: { adults: 1, children: 0, infants: 0 }
    });
    setIsAddingSegment(false);
    toast({
      title: "Segment Added",
      description: "New flight segment has been added successfully."
    });
  };
  
  const handleDeleteSegment = (index: number) => {
    const updatedSegments = editedRequest.segments.filter((_, i) => i !== index);
    const updatedRequest = { ...editedRequest, segments: updatedSegments };
    setEditedRequest(updatedRequest);
    onRequestUpdate?.(updatedRequest);
    toast({
      title: "Segment Deleted",
      description: "Flight segment has been removed successfully."
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
          {!isEditingRequest ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-medium">Request ID:</span>
                  <div className="text-muted-foreground">{editedRequest.id}</div>
                </div>
                <div>
                  <span className="font-medium">Type:</span>
                  <div className="text-muted-foreground">{editedRequest.type}</div>
                </div>
                <div>
                  <span className="font-medium">Client:</span>
                  <div className="text-muted-foreground">
                    <Button 
                      variant="link" 
                      className="p-0 h-auto font-normal text-muted-foreground hover:text-primary transition-colors"
                      onClick={handleClientClick}
                    >
                      {editedRequest.clientName}
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </div>
                <div>
                  <span className="font-medium">Request Date:</span>
                  <div className="text-muted-foreground">{editedRequest.requestDate}</div>
                </div>
              </div>
              {editedRequest.notes && (
                <div>
                  <span className="font-medium">Notes:</span>
                  <div className="text-muted-foreground mt-1">{editedRequest.notes}</div>
                </div>
              )}
              <Button variant="outline" size="sm" onClick={() => setIsEditingRequest(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Request
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Type</Label>
                  <Select value={editedRequest.type} onValueChange={(value) => setEditedRequest({...editedRequest, type: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Business">Business</SelectItem>
                      <SelectItem value="Leisure">Leisure</SelectItem>
                      <SelectItem value="Emergency">Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select value={editedRequest.priority} onValueChange={(value) => setEditedRequest({...editedRequest, priority: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={editedRequest.notes || ""}
                  onChange={(e) => setEditedRequest({...editedRequest, notes: e.target.value})}
                  placeholder="Add notes..."
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveRequest} size="sm">
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
                <Button variant="outline" onClick={() => setIsEditingRequest(false)} size="sm">
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Flight Segments</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsAddingSegment(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Segment
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {editedRequest.segments.map((segment, index) => (
              <SegmentCard 
                key={index}
                segment={segment}
                index={index}
                isEditing={isEditingSegment === index}
                onEdit={() => setIsEditingSegment(index)}
                onSave={(updatedSegment) => handleSaveSegment(index, updatedSegment)}
                onCancel={() => setIsEditingSegment(null)}
                onDelete={() => handleDeleteSegment(index)}
              />
            ))}
            
            {/* Add Segment Dialog */}
            <Dialog open={isAddingSegment} onOpenChange={setIsAddingSegment}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Flight Segment</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>From</Label>
                      <Input
                        value={newSegment.from}
                        onChange={(e) => setNewSegment({...newSegment, from: e.target.value.toUpperCase()})}
                        placeholder="JFK"
                        maxLength={3}
                      />
                    </div>
                    <div>
                      <Label>To</Label>
                      <Input
                        value={newSegment.to}
                        onChange={(e) => setNewSegment({...newSegment, to: e.target.value.toUpperCase()})}
                        placeholder="LAX"
                        maxLength={3}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={newSegment.date}
                      onChange={(e) => setNewSegment({...newSegment, date: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Adults</Label>
                      <Input
                        type="number"
                        min="1"
                        value={newSegment.passengers.adults}
                        onChange={(e) => setNewSegment({
                          ...newSegment, 
                          passengers: {...newSegment.passengers, adults: parseInt(e.target.value) || 1}
                        })}
                      />
                    </div>
                    <div>
                      <Label>Children</Label>
                      <Input
                        type="number"
                        min="0"
                        value={newSegment.passengers.children}
                        onChange={(e) => setNewSegment({
                          ...newSegment, 
                          passengers: {...newSegment.passengers, children: parseInt(e.target.value) || 0}
                        })}
                      />
                    </div>
                    <div>
                      <Label>Infants</Label>
                      <Input
                        type="number"
                        min="0"
                        value={newSegment.passengers.infants}
                        onChange={(e) => setNewSegment({
                          ...newSegment, 
                          passengers: {...newSegment.passengers, infants: parseInt(e.target.value) || 0}
                        })}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddSegment}>
                      <Save className="h-4 w-4 mr-2" />
                      Add Segment
                    </Button>
                    <Button variant="outline" onClick={() => setIsAddingSegment(false)}>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RequestInformation;
