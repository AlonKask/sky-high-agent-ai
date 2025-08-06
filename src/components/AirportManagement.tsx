import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toastHelpers } from "@/utils/toastHelpers";

interface Airport {
  id: string;
  iata_code: string;
  icao_code?: string;
  name: string;
  city: string;
  country: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
}

interface AirportManagementProps {
  searchTerm: string;
}

export function AirportManagement({ searchTerm }: AirportManagementProps) {
  const [airports, setAirports] = useState<Airport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingAirport, setEditingAirport] = useState<Airport | null>(null);
  const [formData, setFormData] = useState({
    iata_code: "",
    icao_code: "",
    name: "",
    city: "",
    country: "",
    latitude: "",
    longitude: "",
    timezone: ""
  });

  useEffect(() => {
    fetchAirports();
  }, []);

  const fetchAirports = async () => {
    try {
      const { data, error } = await supabase
        .from('airport_codes')
        .select('*')
        .order('name');

      if (error) throw error;
      setAirports(data || []);
    } catch (error) {
      toastHelpers.error("Failed to fetch airports");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const submitData = {
        ...formData,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null
      };

      if (editingAirport) {
        const { error } = await supabase
          .from('airport_codes')
          .update(submitData)
          .eq('id', editingAirport.id);
        
        if (error) throw error;
        toastHelpers.success("Airport updated successfully");
      } else {
        const { error } = await supabase
          .from('airport_codes')
          .insert([submitData]);
        
        if (error) throw error;
        toastHelpers.success("Airport created successfully");
      }
      
      setShowDialog(false);
      resetForm();
      fetchAirports();
    } catch (error) {
      toastHelpers.error("Failed to save airport");
    }
  };

  const handleEdit = (airport: Airport) => {
    setEditingAirport(airport);
    setFormData({
      iata_code: airport.iata_code,
      icao_code: airport.icao_code || "",
      name: airport.name,
      city: airport.city,
      country: airport.country,
      latitude: airport.latitude?.toString() || "",
      longitude: airport.longitude?.toString() || "",
      timezone: airport.timezone || ""
    });
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this airport?")) return;
    
    try {
      const { error } = await supabase
        .from('airport_codes')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toastHelpers.success("Airport deleted successfully");
      fetchAirports();
    } catch (error) {
      toastHelpers.error("Failed to delete airport");
    }
  };

  const resetForm = () => {
    setFormData({
      iata_code: "",
      icao_code: "",
      name: "",
      city: "",
      country: "",
      latitude: "",
      longitude: "",
      timezone: ""
    });
    setEditingAirport(null);
  };

  const filteredAirports = airports.filter(airport =>
    airport.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    airport.iata_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    airport.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    airport.country.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CardTitle>Airports Management</CardTitle>
          <Badge variant="secondary" className="text-xs">
            {filteredAirports.length} records
          </Badge>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Airport
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingAirport ? "Edit Airport" : "Add New Airport"}
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
                    maxLength={3}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="icao_code">ICAO Code</Label>
                  <Input
                    id="icao_code"
                    value={formData.icao_code}
                    onChange={(e) => setFormData({...formData, icao_code: e.target.value.toUpperCase()})}
                    maxLength={4}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="name">Airport Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="country">Country *</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => setFormData({...formData, country: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="latitude">Latitude</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="any"
                    value={formData.latitude}
                    onChange={(e) => setFormData({...formData, latitude: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="longitude">Longitude</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="any"
                    value={formData.longitude}
                    onChange={(e) => setFormData({...formData, longitude: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input
                    id="timezone"
                    value={formData.timezone}
                    onChange={(e) => setFormData({...formData, timezone: e.target.value})}
                    placeholder="e.g., America/New_York"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingAirport ? "Update" : "Create"}
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
                <TableHead>IATA</TableHead>
                <TableHead>ICAO</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Country</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : filteredAirports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">No airports found</TableCell>
                </TableRow>
              ) : (
                filteredAirports.map((airport) => (
                  <TableRow key={airport.id}>
                    <TableCell>
                      <Badge variant="outline">{airport.iata_code}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{airport.icao_code || "—"}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{airport.name}</TableCell>
                    <TableCell>{airport.city}</TableCell>
                    <TableCell>{airport.country}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(airport)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(airport.id)}
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