import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toastHelpers } from "@/utils/toastHelpers";

interface Airline {
  id: string;
  iata_code: string;
  icao_code?: string;
  name: string;
  country?: string;
  alliance?: string;
  logo_url?: string;
}

interface AirlineManagementProps {
  searchTerm: string;
}

export function AirlineManagement({ searchTerm }: AirlineManagementProps) {
  const [airlines, setAirlines] = useState<Airline[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingAirline, setEditingAirline] = useState<Airline | null>(null);
  const [formData, setFormData] = useState({
    iata_code: "",
    icao_code: "",
    name: "",
    country: "",
    alliance: "",
    logo_url: ""
  });

  useEffect(() => {
    fetchAirlines();
  }, []);

  const fetchAirlines = async () => {
    try {
      const { data, error } = await supabase
        .from('airline_codes')
        .select('*')
        .order('name');

      if (error) throw error;
      setAirlines(data || []);
    } catch (error) {
      toastHelpers.error("Failed to fetch airlines");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingAirline) {
        const { error } = await supabase
          .from('airline_codes')
          .update(formData)
          .eq('id', editingAirline.id);
        
        if (error) throw error;
        toastHelpers.success("Airline updated successfully");
      } else {
        const { error } = await supabase
          .from('airline_codes')
          .insert([formData]);
        
        if (error) throw error;
        toastHelpers.success("Airline created successfully");
      }
      
      setShowDialog(false);
      resetForm();
      fetchAirlines();
    } catch (error) {
      toastHelpers.error("Failed to save airline");
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
      logo_url: airline.logo_url || ""
    });
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this airline?")) return;
    
    try {
      const { error } = await supabase
        .from('airline_codes')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toastHelpers.success("Airline deleted successfully");
      fetchAirlines();
    } catch (error) {
      toastHelpers.error("Failed to delete airline");
    }
  };

  const resetForm = () => {
    setFormData({
      iata_code: "",
      icao_code: "",
      name: "",
      country: "",
      alliance: "",
      logo_url: ""
    });
    setEditingAirline(null);
  };

  const filteredAirlines = airlines.filter(airline =>
    airline.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    airline.iata_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    airline.country?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Airlines Management</CardTitle>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
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
                  />
                </div>
                <div>
                  <Label htmlFor="icao_code">ICAO Code</Label>
                  <Input
                    id="icao_code"
                    value={formData.icao_code}
                    onChange={(e) => setFormData({...formData, icao_code: e.target.value.toUpperCase()})}
                    maxLength={3}
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
                  <Input
                    id="alliance"
                    value={formData.alliance}
                    onChange={(e) => setFormData({...formData, alliance: e.target.value})}
                  />
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
                <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
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
                <TableHead>IATA</TableHead>
                <TableHead>ICAO</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Alliance</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : filteredAirlines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">No airlines found</TableCell>
                </TableRow>
              ) : (
                filteredAirlines.map((airline) => (
                  <TableRow key={airline.id}>
                    <TableCell>
                      <Badge variant="outline">{airline.iata_code}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{airline.icao_code || "—"}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{airline.name}</TableCell>
                    <TableCell>{airline.country || "—"}</TableCell>
                    <TableCell>{airline.alliance || "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(airline)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(airline.id)}
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