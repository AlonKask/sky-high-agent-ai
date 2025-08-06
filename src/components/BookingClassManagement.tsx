import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Edit, Trash2, Download } from "lucide-react";
import { useBookingClasses, useBookingClassMutations, useAirlines, useDebouncedSearch, BookingClass } from "@/hooks/useIATAData";

interface Airline {
  id: string;
  iata_code: string;
  name: string;
}

interface BookingClassManagementProps {
  searchTerm: string;
}

const SERVICE_CLASSES = [
  "Economy",
  "Premium Economy", 
  "Business",
  "First"
];

export function BookingClassManagement({ searchTerm }: BookingClassManagementProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [editingClass, setEditingClass] = useState<BookingClass | null>(null);
  const [formData, setFormData] = useState({
    booking_class_code: "",
    airline_id: "",
    service_class: "",
    class_description: "",
    booking_priority: 1,
    active: true
  });

  // Use optimized hooks
  const { debouncedValue } = useDebouncedSearch(searchTerm);
  const { data: bookingClasses = [], isLoading: classesLoading, error: classesError } = useBookingClasses(debouncedValue);
  const { data: airlines = [], isLoading: airlinesLoading } = useAirlines('', true);
  const { createBookingClass, updateBookingClass, deleteBookingClass } = useBookingClassMutations();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingClass) {
        await updateBookingClass.mutateAsync({ id: editingClass.id, ...formData });
      } else {
        await createBookingClass.mutateAsync(formData);
      }
      
      setShowDialog(false);
      resetForm();
    } catch (error) {
      console.error('Error saving booking class:', error);
    }
  };

  const handleEdit = (bookingClass: BookingClass) => {
    setEditingClass(bookingClass);
    setFormData({
      booking_class_code: bookingClass.booking_class_code,
      airline_id: bookingClass.airline_id,
      service_class: bookingClass.service_class,
      class_description: bookingClass.class_description || "",
      booking_priority: bookingClass.booking_priority,
      active: bookingClass.active
    });
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this booking class?")) return;
    
    try {
      await deleteBookingClass.mutateAsync(id);
    } catch (error) {
      console.error('Error deleting booking class:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      booking_class_code: "",
      airline_id: "",
      service_class: "",
      class_description: "",
      booking_priority: 1,
      active: true
    });
    setEditingClass(null);
  };

  const handleExport = () => {
    const csvContent = [
      "Class Code,Airline Code,Airline Name,Service Class,Description,Priority,Status",
      ...bookingClasses.map(bc => 
        `${bc.booking_class_code},${bc.airline_iata || ''},${bc.airline_name || ''},${bc.service_class},${bc.class_description || ''},${bc.booking_priority},${bc.active ? 'Active' : 'Inactive'}`
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'booking_classes_export.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const getServiceClassColor = (serviceClass: string) => {
    switch (serviceClass) {
      case 'Economy': return 'bg-blue-100 text-blue-800';
      case 'Premium Economy': return 'bg-purple-100 text-purple-800';
      case 'Business': return 'bg-yellow-100 text-yellow-800';
      case 'First': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CardTitle>Booking Classes Management</CardTitle>
          <Badge variant="secondary" className="text-xs">
            {bookingClasses.length} records
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Booking Class
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingClass ? "Edit Booking Class" : "Add New Booking Class"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="booking_class_code">Class Code *</Label>
                    <Input
                      id="booking_class_code"
                      value={formData.booking_class_code}
                      onChange={(e) => setFormData({...formData, booking_class_code: e.target.value.toUpperCase()})}
                      maxLength={1}
                      placeholder="Y, J, F, etc."
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="airline_id">Airline *</Label>
                    <Select
                      value={formData.airline_id}
                      onValueChange={(value) => setFormData({...formData, airline_id: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select airline" />
                      </SelectTrigger>
                      <SelectContent>
                        {airlines.map((airline) => (
                          <SelectItem key={airline.id} value={airline.id}>
                            {airline.iata_code} - {airline.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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
                      {SERVICE_CLASSES.map((serviceClass) => (
                        <SelectItem key={serviceClass} value={serviceClass}>
                          {serviceClass}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="class_description">Description</Label>
                  <Input
                    id="class_description"
                    value={formData.class_description}
                    onChange={(e) => setFormData({...formData, class_description: e.target.value})}
                    placeholder="Optional description"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="booking_priority">Priority</Label>
                    <Input
                      id="booking_priority"
                      type="number"
                      min="1"
                      value={formData.booking_priority}
                      onChange={(e) => setFormData({...formData, booking_priority: parseInt(e.target.value)})}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="active"
                      checked={formData.active}
                      onCheckedChange={(checked) => setFormData({...formData, active: checked})}
                    />
                    <Label htmlFor="active">Active</Label>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingClass ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class Code</TableHead>
                <TableHead>Airline</TableHead>
                <TableHead>Service Class</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classesLoading || airlinesLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  </TableRow>
                ))
              ) : classesError ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-destructive">
                    Error loading booking classes: {classesError.message}
                  </TableCell>
                </TableRow>
              ) : bookingClasses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">No booking classes found</TableCell>
                </TableRow>
              ) : (
                bookingClasses.map((bookingClass) => (
                  <TableRow key={bookingClass.id}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {bookingClass.booking_class_code}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {bookingClass.airline_iata}
                        </Badge>
                        <span className="text-sm">{bookingClass.airline_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getServiceClassColor(bookingClass.service_class)}>
                        {bookingClass.service_class}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {bookingClass.class_description || "-"}
                    </TableCell>
                    <TableCell>{bookingClass.booking_priority}</TableCell>
                    <TableCell>
                      <Badge variant={bookingClass.active ? "default" : "secondary"}>
                        {bookingClass.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(bookingClass)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(bookingClass.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}