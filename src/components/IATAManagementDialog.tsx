import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Edit, Plus, Search, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toastHelpers } from "@/utils/toastHelpers";

interface AirportCode {
  id: string;
  iata_code: string;
  icao_code?: string;
  name: string;
  city: string;
  country: string;
  timezone?: string;
  latitude?: number;
  longitude?: number;
}

interface AirlineCode {
  id: string;
  iata_code: string;
  icao_code?: string;
  name: string;
  country?: string;
  alliance?: string;
  logo_url?: string;
}

interface IATAManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const IATAManagementDialog = ({ open, onOpenChange }: IATAManagementDialogProps) => {
  const [airports, setAirports] = useState<AirportCode[]>([]);
  const [airlines, setAirlines] = useState<AirlineCode[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingAirport, setEditingAirport] = useState<string | null>(null);
  const [editingAirline, setEditingAirline] = useState<string | null>(null);
  const [newAirport, setNewAirport] = useState<Partial<AirportCode>>({});
  const [newAirline, setNewAirline] = useState<Partial<AirlineCode>>({});
  const [showAddAirport, setShowAddAirport] = useState(false);
  const [showAddAirline, setShowAddAirline] = useState(false);

  const alliances = ["Star Alliance", "oneworld", "SkyTeam"];

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [airportsRes, airlinesRes] = await Promise.all([
        supabase.from('airport_codes').select('*').order('iata_code'),
        supabase.from('airline_codes').select('*').order('iata_code')
      ]);

      if (airportsRes.error) throw airportsRes.error;
      if (airlinesRes.error) throw airlinesRes.error;

      setAirports(airportsRes.data || []);
      setAirlines(airlinesRes.data || []);
    } catch (error) {
      console.error('Error fetching IATA data:', error);
      toast.error('Failed to load IATA data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAirport = async (airport: AirportCode) => {
    try {
      const { error } = await supabase
        .from('airport_codes')
        .update({
          iata_code: airport.iata_code,
          icao_code: airport.icao_code,
          name: airport.name,
          city: airport.city,
          country: airport.country,
          timezone: airport.timezone,
          latitude: airport.latitude,
          longitude: airport.longitude
        })
        .eq('id', airport.id);

      if (error) throw error;

      setAirports(prev => prev.map(a => a.id === airport.id ? airport : a));
      setEditingAirport(null);
      toast.success('Airport updated successfully');
    } catch (error) {
      console.error('Error updating airport:', error);
      toast.error('Failed to update airport');
    }
  };

  const handleSaveAirline = async (airline: AirlineCode) => {
    try {
      const { error } = await supabase
        .from('airline_codes')
        .update({
          iata_code: airline.iata_code,
          icao_code: airline.icao_code,
          name: airline.name,
          country: airline.country,
          alliance: airline.alliance,
          logo_url: airline.logo_url
        })
        .eq('id', airline.id);

      if (error) throw error;

      setAirlines(prev => prev.map(a => a.id === airline.id ? airline : a));
      setEditingAirline(null);
      toast.success('Airline updated successfully');
    } catch (error) {
      console.error('Error updating airline:', error);
      toast.error('Failed to update airline');
    }
  };

  const handleAddAirport = async () => {
    if (!newAirport.iata_code || !newAirport.name || !newAirport.city || !newAirport.country) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const airportToInsert = {
        iata_code: newAirport.iata_code,
        name: newAirport.name,
        city: newAirport.city,
        country: newAirport.country,
        icao_code: newAirport.icao_code || null,
        timezone: newAirport.timezone || null,
        latitude: newAirport.latitude || null,
        longitude: newAirport.longitude || null
      };

      const { data, error } = await supabase
        .from('airport_codes')
        .insert([airportToInsert])
        .select()
        .single();

      if (error) throw error;

      setAirports(prev => [...prev, data]);
      setNewAirport({});
      setShowAddAirport(false);
      toast.success('Airport added successfully');
    } catch (error) {
      console.error('Error adding airport:', error);
      toast.error('Failed to add airport');
    }
  };

  const handleAddAirline = async () => {
    if (!newAirline.iata_code || !newAirline.name) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const airlineToInsert = {
        iata_code: newAirline.iata_code,
        name: newAirline.name,
        icao_code: newAirline.icao_code || null,
        country: newAirline.country || null,
        alliance: newAirline.alliance || null,
        logo_url: newAirline.logo_url || null
      };

      const { data, error } = await supabase
        .from('airline_codes')
        .insert([airlineToInsert])
        .select()
        .single();

      if (error) throw error;

      setAirlines(prev => [...prev, data]);
      setNewAirline({});
      setShowAddAirline(false);
      toast.success('Airline added successfully');
    } catch (error) {
      console.error('Error adding airline:', error);
      toast.error('Failed to add airline');
    }
  };

  const handleDeleteAirport = async (id: string) => {
    try {
      const { error } = await supabase
        .from('airport_codes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setAirports(prev => prev.filter(a => a.id !== id));
      toast.success('Airport deleted successfully');
    } catch (error) {
      console.error('Error deleting airport:', error);
      toast.error('Failed to delete airport');
    }
  };

  const handleDeleteAirline = async (id: string) => {
    try {
      const { error } = await supabase
        .from('airline_codes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setAirlines(prev => prev.filter(a => a.id !== id));
      toast.success('Airline deleted successfully');
    } catch (error) {
      console.error('Error deleting airline:', error);
      toast.error('Failed to delete airline');
    }
  };

  const filteredAirports = airports.filter(airport =>
    airport.iata_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    airport.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    airport.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    airport.country.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAirlines = airlines.filter(airline =>
    airline.iata_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    airline.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (airline.country && airline.country.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>IATA Codes Management</DialogTitle>
          <DialogDescription>
            Manage airport and airline IATA codes database
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center space-x-2 mb-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search codes, names, cities, countries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          <Badge variant="outline">
            {airports.length} Airports • {airlines.length} Airlines
          </Badge>
        </div>

        <Tabs defaultValue="airports" className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="airports">Airport Codes</TabsTrigger>
            <TabsTrigger value="airlines">Airline Codes</TabsTrigger>
          </TabsList>

          <TabsContent value="airports" className="mt-4 overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Airport Codes ({filteredAirports.length})</h3>
              <Button onClick={() => setShowAddAirport(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Airport
              </Button>
            </div>

            <div className="overflow-auto flex-1">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>IATA</TableHead>
                    <TableHead>ICAO</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Timezone</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {showAddAirport && (
                    <TableRow>
                      <TableCell>
                        <Input
                          placeholder="IATA"
                          value={newAirport.iata_code || ''}
                          onChange={(e) => setNewAirport(prev => ({ ...prev, iata_code: e.target.value.toUpperCase() }))}
                          className="w-16"
                          maxLength={3}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder="ICAO"
                          value={newAirport.icao_code || ''}
                          onChange={(e) => setNewAirport(prev => ({ ...prev, icao_code: e.target.value.toUpperCase() }))}
                          className="w-20"
                          maxLength={4}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder="Airport Name"
                          value={newAirport.name || ''}
                          onChange={(e) => setNewAirport(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder="City"
                          value={newAirport.city || ''}
                          onChange={(e) => setNewAirport(prev => ({ ...prev, city: e.target.value }))}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder="Country"
                          value={newAirport.country || ''}
                          onChange={(e) => setNewAirport(prev => ({ ...prev, country: e.target.value }))}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder="Timezone"
                          value={newAirport.timezone || ''}
                          onChange={(e) => setNewAirport(prev => ({ ...prev, timezone: e.target.value }))}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button size="sm" onClick={handleAddAirport}>
                            <Save className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => {
                            setShowAddAirport(false);
                            setNewAirport({});
                          }}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredAirports.map((airport) => (
                    <TableRow key={airport.id}>
                      <TableCell>
                        {editingAirport === airport.id ? (
                          <Input
                            value={airport.iata_code}
                            onChange={(e) => setAirports(prev => prev.map(a => 
                              a.id === airport.id ? { ...a, iata_code: e.target.value.toUpperCase() } : a
                            ))}
                            className="w-16"
                            maxLength={3}
                          />
                        ) : (
                          <Badge variant="secondary">{airport.iata_code}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingAirport === airport.id ? (
                          <Input
                            value={airport.icao_code || ''}
                            onChange={(e) => setAirports(prev => prev.map(a => 
                              a.id === airport.id ? { ...a, icao_code: e.target.value.toUpperCase() } : a
                            ))}
                            className="w-20"
                            maxLength={4}
                          />
                        ) : (
                          airport.icao_code
                        )}
                      </TableCell>
                      <TableCell>
                        {editingAirport === airport.id ? (
                          <Input
                            value={airport.name}
                            onChange={(e) => setAirports(prev => prev.map(a => 
                              a.id === airport.id ? { ...a, name: e.target.value } : a
                            ))}
                          />
                        ) : (
                          airport.name
                        )}
                      </TableCell>
                      <TableCell>
                        {editingAirport === airport.id ? (
                          <Input
                            value={airport.city}
                            onChange={(e) => setAirports(prev => prev.map(a => 
                              a.id === airport.id ? { ...a, city: e.target.value } : a
                            ))}
                          />
                        ) : (
                          airport.city
                        )}
                      </TableCell>
                      <TableCell>
                        {editingAirport === airport.id ? (
                          <Input
                            value={airport.country}
                            onChange={(e) => setAirports(prev => prev.map(a => 
                              a.id === airport.id ? { ...a, country: e.target.value } : a
                            ))}
                          />
                        ) : (
                          airport.country
                        )}
                      </TableCell>
                      <TableCell>
                        {editingAirport === airport.id ? (
                          <Input
                            value={airport.timezone || ''}
                            onChange={(e) => setAirports(prev => prev.map(a => 
                              a.id === airport.id ? { ...a, timezone: e.target.value } : a
                            ))}
                          />
                        ) : (
                          airport.timezone
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          {editingAirport === airport.id ? (
                            <>
                              <Button size="sm" onClick={() => handleSaveAirport(airport)}>
                                <Save className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingAirport(null)}>
                                <X className="h-3 w-3" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button size="sm" variant="outline" onClick={() => setEditingAirport(airport.id)}>
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => handleDeleteAirport(airport.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="airlines" className="mt-4 overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Airline Codes ({filteredAirlines.length})</h3>
              <Button onClick={() => setShowAddAirline(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Airline
              </Button>
            </div>

            <div className="overflow-auto flex-1">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>IATA</TableHead>
                    <TableHead>ICAO</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Alliance</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {showAddAirline && (
                    <TableRow>
                      <TableCell>
                        <Input
                          placeholder="IATA"
                          value={newAirline.iata_code || ''}
                          onChange={(e) => setNewAirline(prev => ({ ...prev, iata_code: e.target.value.toUpperCase() }))}
                          className="w-16"
                          maxLength={2}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder="ICAO"
                          value={newAirline.icao_code || ''}
                          onChange={(e) => setNewAirline(prev => ({ ...prev, icao_code: e.target.value.toUpperCase() }))}
                          className="w-20"
                          maxLength={3}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder="Airline Name"
                          value={newAirline.name || ''}
                          onChange={(e) => setNewAirline(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder="Country"
                          value={newAirline.country || ''}
                          onChange={(e) => setNewAirline(prev => ({ ...prev, country: e.target.value }))}
                        />
                      </TableCell>
                      <TableCell>
                        <Select value={newAirline.alliance || ''} onValueChange={(value) => setNewAirline(prev => ({ ...prev, alliance: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select alliance" />
                          </SelectTrigger>
                          <SelectContent>
                            {alliances.map((alliance) => (
                              <SelectItem key={alliance} value={alliance}>{alliance}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button size="sm" onClick={handleAddAirline}>
                            <Save className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => {
                            setShowAddAirline(false);
                            setNewAirline({});
                          }}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredAirlines.map((airline) => (
                    <TableRow key={airline.id}>
                      <TableCell>
                        {editingAirline === airline.id ? (
                          <Input
                            value={airline.iata_code}
                            onChange={(e) => setAirlines(prev => prev.map(a => 
                              a.id === airline.id ? { ...a, iata_code: e.target.value.toUpperCase() } : a
                            ))}
                            className="w-16"
                            maxLength={2}
                          />
                        ) : (
                          <Badge variant="secondary">{airline.iata_code}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingAirline === airline.id ? (
                          <Input
                            value={airline.icao_code || ''}
                            onChange={(e) => setAirlines(prev => prev.map(a => 
                              a.id === airline.id ? { ...a, icao_code: e.target.value.toUpperCase() } : a
                            ))}
                            className="w-20"
                            maxLength={3}
                          />
                        ) : (
                          airline.icao_code
                        )}
                      </TableCell>
                      <TableCell>
                        {editingAirline === airline.id ? (
                          <Input
                            value={airline.name}
                            onChange={(e) => setAirlines(prev => prev.map(a => 
                              a.id === airline.id ? { ...a, name: e.target.value } : a
                            ))}
                          />
                        ) : (
                          airline.name
                        )}
                      </TableCell>
                      <TableCell>
                        {editingAirline === airline.id ? (
                          <Input
                            value={airline.country || ''}
                            onChange={(e) => setAirlines(prev => prev.map(a => 
                              a.id === airline.id ? { ...a, country: e.target.value } : a
                            ))}
                          />
                        ) : (
                          airline.country
                        )}
                      </TableCell>
                      <TableCell>
                        {editingAirline === airline.id ? (
                          <Select value={airline.alliance || ''} onValueChange={(value) => 
                            setAirlines(prev => prev.map(a => 
                              a.id === airline.id ? { ...a, alliance: value } : a
                            ))
                          }>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {alliances.map((alliance) => (
                                <SelectItem key={alliance} value={alliance}>{alliance}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          airline.alliance && (
                            <Badge variant="outline">{airline.alliance}</Badge>
                          )
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          {editingAirline === airline.id ? (
                            <>
                              <Button size="sm" onClick={() => handleSaveAirline(airline)}>
                                <Save className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingAirline(null)}>
                                <X className="h-3 w-3" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button size="sm" variant="outline" onClick={() => setEditingAirline(airline.id)}>
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => handleDeleteAirline(airline.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};