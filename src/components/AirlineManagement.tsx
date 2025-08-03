import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Edit, Trash2, ChevronDown, Settings, Plane } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AirlineRBDAssignment } from "./AirlineRBDAssignment";

interface Airline {
  id: string;
  iata_code: string;
  icao_code?: string;
  name: string;
  country?: string;
  alliance?: string;
  logo_url?: string;
  created_at?: string;
}

interface BookingClass {
  id: string;
  booking_class_code: string;
  service_class: string;
  class_description?: string;
  booking_priority?: number;
  airline_id?: string;
  active: boolean;
}

interface AirlineManagementProps {
  searchTerm: string;
}

export function AirlineManagement({ searchTerm }: AirlineManagementProps) {
  const [airlines, setAirlines] = useState<Airline[]>([]);
  const [bookingClasses, setBookingClasses] = useState<BookingClass[]>([]);
  const [airlineRBDs, setAirlineRBDs] = useState<{ [key: string]: BookingClass[] }>({});
  const [expandedAirlines, setExpandedAirlines] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRBDDialogOpen, setIsRBDDialogOpen] = useState(false);
  const [selectedAirlineForRBD, setSelectedAirlineForRBD] = useState<Airline | null>(null);
  const [editingAirline, setEditingAirline] = useState<Airline | null>(null);
  const [formData, setFormData] = useState({
    iata_code: "",
    icao_code: "",
    name: "",
    country: "",
    alliance: "",
    logo_url: "",
  });
  const [rbdFormData, setRbdFormData] = useState({
    booking_class_code: "",
    service_class: "Economy",
    class_description: "",
    booking_priority: 1,
    active: true,
  });
  const { toast } = useToast();

  const fetchAirlines = async () => {
    try {
      const { data, error } = await supabase
        .from('airline_codes')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setAirlines(data || []);
      
        // Fetch RBD assignments for each airline
        if (data) {
          const rbdData: { [key: string]: BookingClass[] } = {};
          for (const airline of data) {
            const { data: rbds } = await supabase
              .from('airline_rbd_assignments')
              .select('*')
              .eq('airline_id', airline.id)
              .eq('is_active', true)
              .order('booking_priority', { ascending: false });
            rbdData[airline.id] = rbds?.map(rbd => ({
              id: rbd.id,
              booking_class_code: rbd.booking_class_code,
              service_class: rbd.service_class,
              class_description: rbd.class_description,
              booking_priority: rbd.booking_priority,
              airline_id: rbd.airline_id,
              active: rbd.is_active
            })) || [];
          }
          setAirlineRBDs(rbdData);
        }
    } catch (error) {
      console.error('Error fetching airlines:', error);
      toast({
        title: "Error",
        description: "Failed to fetch airlines",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchBookingClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('booking_classes')
        .select('*')
        .order('service_class', { ascending: true });
      
      if (error) throw error;
      setBookingClasses(data || []);
    } catch (error) {
      console.error('Error fetching booking classes:', error);
    }
  };

  useEffect(() => {
    fetchAirlines();
    fetchBookingClasses();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.iata_code.trim() || !formData.name.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingAirline) {
        const { error } = await supabase
          .from('airline_codes')
          .update(formData)
          .eq('id', editingAirline.id);
        
        if (error) throw error;
        toast({
          title: "Success",
          description: "Airline updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('airline_codes')
          .insert([formData]);
        
        if (error) throw error;
        toast({
          title: "Success",
          description: "Airline created successfully",
        });
      }
      
      setIsDialogOpen(false);
      resetForm();
      fetchAirlines();
    } catch (error) {
      console.error('Error saving airline:', error);
      toast({
        title: "Error",
        description: "Failed to save airline",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (airline: Airline) => {
    setEditingAirline(airline);
    setFormData({
      iata_code: airline.iata_code,
      icao_code: airline.icao_code || "",
      name: airline.name,
      country: airline.country || "",
      alliance: airline.alliance || "",
      logo_url: airline.logo_url || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this airline?")) return;
    
    try {
      const { error } = await supabase
        .from('airline_codes')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast({
        title: "Success",
        description: "Airline deleted successfully",
      });
      fetchAirlines();
    } catch (error) {
      console.error('Error deleting airline:', error);
      toast({
        title: "Error",
        description: "Failed to delete airline",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      iata_code: "",
      icao_code: "",
      name: "",
      country: "",
      alliance: "",
      logo_url: "",
    });
    setEditingAirline(null);
  };

  const resetRBDForm = () => {
    setRbdFormData({
      booking_class_code: "",
      service_class: "Economy",
      class_description: "",
      booking_priority: 1,
      active: true,
    });
  };

  const handleManageRBDs = (airline: Airline) => {
    setSelectedAirlineForRBD(airline);
    setIsRBDDialogOpen(true);
  };

  const handleAddRBD = async () => {
    if (!selectedAirlineForRBD || !rbdFormData.booking_class_code.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('booking_classes')
        .insert([{
          ...rbdFormData,
          airline_id: selectedAirlineForRBD.id,
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "RBD added successfully",
      });

      resetRBDForm();
      fetchAirlines(); // Refresh to update RBD counts
    } catch (error) {
      console.error('Error adding RBD:', error);
      toast({
        title: "Error",
        description: "Failed to add RBD",
        variant: "destructive",
      });
    }
  };

  const toggleAirlineExpansion = (airlineId: string) => {
    const newExpanded = new Set(expandedAirlines);
    if (newExpanded.has(airlineId)) {
      newExpanded.delete(airlineId);
    } else {
      newExpanded.add(airlineId);
    }
    setExpandedAirlines(newExpanded);
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

  const filteredAirlines = airlines.filter(airline =>
    airline.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    airline.iata_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    airline.country?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CardTitle>Airlines Management</CardTitle>
          <Badge variant="secondary" className="text-xs">
            {filteredAirlines.length} records
          </Badge>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Airline
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingAirline ? "Edit Airline" : "Add New Airline"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="iata_code">IATA Code *</Label>
                  <Input
                    id="iata_code"
                    value={formData.iata_code}
                    onChange={(e) => setFormData({...formData, iata_code: e.target.value.toUpperCase()})}
                    maxLength={2}
                    required
                    className="font-mono"
                  />
                </div>
                <div>
                  <Label htmlFor="icao_code">ICAO Code</Label>
                  <Input
                    id="icao_code"
                    value={formData.icao_code}
                    onChange={(e) => setFormData({...formData, icao_code: e.target.value.toUpperCase()})}
                    maxLength={3}
                    className="font-mono"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="name">Airline Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => setFormData({...formData, country: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="alliance">Alliance</Label>
                  <select
                    id="alliance"
                    className="w-full p-2 border rounded-md"
                    value={formData.alliance}
                    onChange={(e) => setFormData({...formData, alliance: e.target.value})}
                  >
                    <option value="">Select Alliance</option>
                    <option value="Star Alliance">Star Alliance</option>
                    <option value="Oneworld">Oneworld</option>
                    <option value="SkyTeam">SkyTeam</option>
                  </select>
                </div>
              </div>
              <div>
                <Label htmlFor="logo_url">Logo URL</Label>
                <Input
                  id="logo_url"
                  value={formData.logo_url}
                  onChange={(e) => setFormData({...formData, logo_url: e.target.value})}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingAirline ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>IATA Code</TableHead>
                <TableHead>ICAO Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Alliance</TableHead>
                <TableHead>RBDs</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">Loading airlines...</TableCell>
                </TableRow>
              ) : filteredAirlines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">No airlines found</TableCell>
                </TableRow>
              ) : (
                filteredAirlines.map((airline) => {
                  const airlineRBDList = airlineRBDs[airline.id] || [];
                  const isExpanded = expandedAirlines.has(airline.id);
                  
                  return (
                    <Collapsible key={airline.id} open={isExpanded} onOpenChange={() => toggleAirlineExpansion(airline.id)}>
                      <CollapsibleTrigger asChild>
                        <TableRow className="cursor-pointer hover:bg-muted/50">
                          <TableCell className="font-mono font-semibold">{airline.iata_code}</TableCell>
                          <TableCell className="font-mono">{airline.icao_code || '-'}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                              {airline.name}
                            </div>
                          </TableCell>
                          <TableCell>{airline.country || '-'}</TableCell>
                          <TableCell>
                            {airline.alliance && (
                              <Badge variant="outline">{airline.alliance}</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {airlineRBDList.length} RBDs
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleManageRBDs(airline);
                                }}
                                title="Manage RBDs"
                              >
                                <Settings className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(airline);
                                }}
                                title="Edit Airline"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(airline.id);
                                }}
                                title="Delete Airline"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      </CollapsibleTrigger>
                      <CollapsibleContent asChild>
                        <TableRow>
                          <TableCell colSpan={7} className="p-4 bg-muted/20">
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium">RBD Configuration</h4>
                              {airlineRBDList.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                  {airlineRBDList.map((rbd) => (
                                    <div key={rbd.id} className="flex items-center gap-2 p-2 border rounded">
                                      <span className="font-mono font-bold">{rbd.booking_class_code}</span>
                                      <Badge variant="outline" className={getServiceClassColor(rbd.service_class)}>
                                        {rbd.service_class}
                                      </Badge>
                                      <span className="text-xs text-muted-foreground">P{rbd.booking_priority}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">No RBDs configured for this airline.</p>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Enhanced RBD Management Dialog */}
      {selectedAirlineForRBD && isRBDDialogOpen && (
        <AirlineRBDAssignment
          airline={selectedAirlineForRBD}
          onClose={() => {
            setIsRBDDialogOpen(false);
            setSelectedAirlineForRBD(null);
            fetchAirlines(); // Refresh to update RBD counts
          }}
        />
      )}
    </Card>
  );
}