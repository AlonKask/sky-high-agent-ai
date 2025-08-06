import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAirlineRBDs, useAirlineRBDMutations } from "@/hooks/useIATAData";

interface InlineRBDManagementProps {
  airlineId: string;
  airlineName: string;
  airlineIata: string;
}

export function InlineRBDManagement({ airlineId, airlineName, airlineIata }: InlineRBDManagementProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingRBD, setEditingRBD] = useState<any>(null);
  const [formData, setFormData] = useState({
    booking_class_code: "",
    service_class: "",
    class_description: "",
    booking_priority: 1,
    is_active: true,
    effective_from: "",
    effective_until: "",
  });

  const { data: rbds = [], isLoading, error } = useAirlineRBDs(airlineId);
  const { createRBD, updateRBD, deleteRBD } = useAirlineRBDMutations();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.booking_class_code.trim() || !formData.service_class.trim()) {
      return;
    }

    try {
      const rbdData = {
        airline_id: airlineId,
        booking_class_code: formData.booking_class_code.toUpperCase(),
        service_class: formData.service_class,
        class_description: formData.class_description || null,
        booking_priority: formData.booking_priority,
        is_active: formData.is_active,
        effective_from: formData.effective_from || null,
        effective_until: formData.effective_until || null,
      };

      if (editingRBD) {
        await updateRBD.mutateAsync({ id: editingRBD.id, airline_id: airlineId, ...rbdData });
      } else {
        await createRBD.mutateAsync(rbdData);
      }
      
      setIsAddDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving RBD:', error);
    }
  };

  const handleEdit = (rbd: any) => {
    setEditingRBD(rbd);
    setFormData({
      booking_class_code: rbd.booking_class_code,
      service_class: rbd.service_class,
      class_description: rbd.class_description || "",
      booking_priority: rbd.booking_priority,
      is_active: rbd.is_active,
      effective_from: rbd.effective_from || "",
      effective_until: rbd.effective_until || "",
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this RBD assignment?")) return;
    
    try {
      await deleteRBD.mutateAsync({ id, airline_id: airlineId });
    } catch (error) {
      console.error('Error deleting RBD:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      booking_class_code: "",
      service_class: "",
      class_description: "",
      booking_priority: 1,
      is_active: true,
      effective_from: "",
      effective_until: "",
    });
    setEditingRBD(null);
  };

  const getServiceClassColor = (serviceClass: string) => {
    switch (serviceClass.toLowerCase()) {
      case 'first':
        return 'bg-yellow-500/10 text-yellow-700 border-yellow-300';
      case 'business':
        return 'bg-blue-500/10 text-blue-700 border-blue-300';
      case 'premium economy':
        return 'bg-purple-500/10 text-purple-700 border-purple-300';
      case 'economy':
        return 'bg-green-500/10 text-green-700 border-green-300';
      default:
        return 'bg-gray-500/10 text-gray-700 border-gray-300';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium">RBD Assignments for {airlineName} ({airlineIata})</h4>
          <p className="text-xs text-muted-foreground">{rbds.length} booking class assignments</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add RBD
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingRBD ? "Edit RBD Assignment" : "Add RBD Assignment"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="booking_class_code">Booking Class Code *</Label>
                  <Input
                    id="booking_class_code"
                    value={formData.booking_class_code}
                    onChange={(e) => setFormData({...formData, booking_class_code: e.target.value.toUpperCase()})}
                    maxLength={2}
                    required
                    className="font-mono"
                  />
                </div>
                <div>
                  <Label htmlFor="service_class">Service Class *</Label>
                  <Select 
                    value={formData.service_class} 
                    onValueChange={(value) => setFormData({...formData, service_class: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select service class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="First">First</SelectItem>
                      <SelectItem value="Business">Business</SelectItem>
                      <SelectItem value="Premium Economy">Premium Economy</SelectItem>
                      <SelectItem value="Economy">Economy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="class_description">Description</Label>
                <Input
                  id="class_description"
                  value={formData.class_description}
                  onChange={(e) => setFormData({...formData, class_description: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="booking_priority">Priority</Label>
                  <Input
                    id="booking_priority"
                    type="number"
                    min="1"
                    max="10"
                    value={formData.booking_priority}
                    onChange={(e) => setFormData({...formData, booking_priority: parseInt(e.target.value)})}
                  />
                </div>
                <div className="flex items-center space-x-2 pt-6">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingRBD ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load RBDs: {error.message}
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
      ) : rbds.length === 0 ? (
        <div className="text-center py-4 text-sm text-muted-foreground">
          No RBD assignments found. Click "Add RBD" to create the first one.
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Service Class</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rbds.map((rbd) => (
                <TableRow key={rbd.id}>
                  <TableCell className="font-mono font-semibold">{rbd.booking_class_code}</TableCell>
                  <TableCell>
                    <Badge className={getServiceClassColor(rbd.service_class)}>
                      {rbd.service_class}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{rbd.class_description || '-'}</TableCell>
                  <TableCell>{rbd.booking_priority}</TableCell>
                  <TableCell>
                    <Badge variant={rbd.is_active ? "default" : "secondary"}>
                      {rbd.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(rbd)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(rbd.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}