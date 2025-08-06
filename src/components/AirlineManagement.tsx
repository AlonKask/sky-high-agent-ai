import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Edit, Trash2, ChevronDown, Settings, Download, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AirlineRBDAssignment } from "./AirlineRBDAssignment";
import { useAirlines, useAirlineMutations, type Airline } from "@/hooks/useIATAData";

interface AirlineManagementProps {
  searchTerm: string;
}

export function AirlineManagement({ searchTerm }: AirlineManagementProps) {
  const [expandedAirlines, setExpandedAirlines] = useState<Set<string>>(new Set());
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
  
  const { toast } = useToast();
  
  // Use optimized hooks for data fetching
  const { 
    data: airlines = [], 
    isLoading: loading, 
    error: airlinesError,
    refetch: refetchAirlines 
  } = useAirlines(searchTerm);
  
  const { createAirline, updateAirline, deleteAirline } = useAirlineMutations();

  // Filter airlines based on search term
  const filteredAirlines = useMemo(() => {
    if (!searchTerm.trim()) return airlines;
    
    const searchLower = searchTerm.toLowerCase();
    return airlines.filter(airline =>
      airline.name.toLowerCase().includes(searchLower) ||
      airline.iata_code.toLowerCase().includes(searchLower) ||
      airline.country?.toLowerCase().includes(searchLower) ||
      airline.alliance?.toLowerCase().includes(searchLower)
    );
  }, [airlines, searchTerm]);

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
        await updateAirline.mutateAsync({ id: editingAirline.id, ...formData });
      } else {
        await createAirline.mutateAsync(formData);
      }
      
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving airline:', error);
      // Error handling is done in the mutation hooks
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
      await deleteAirline.mutateAsync(id);
    } catch (error) {
      console.error('Error deleting airline:', error);
      // Error handling is done in the mutation hook
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

  const handleManageRBDs = (airline: Airline) => {
    setSelectedAirlineForRBD(airline);
    setIsRBDDialogOpen(true);
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

  const handleExport = () => {
    const csvContent = [
      "IATA Code,ICAO Code,Name,Country,Alliance,Logo URL,RBD Count",
      ...airlines.map(airline => 
        `${airline.iata_code},${airline.icao_code || ''},${airline.name},${airline.country || ''},${airline.alliance || ''},${airline.logo_url || ''},${airline.rbd_count || 0}`
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'airlines_export.csv';
    a.click();
    URL.revokeObjectURL(url);
  };


  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CardTitle>Airlines Management</CardTitle>
          <Badge variant="secondary" className="text-xs">
            {airlines.length} records
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
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
        </div>
      </CardHeader>
      
      <CardContent>
        {airlinesError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load airlines: {airlinesError.message}
            </AlertDescription>
          </Alert>
        )}
        
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
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  </TableRow>
                ))
              ) : filteredAirlines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">No airlines found</TableCell>
                </TableRow>
              ) : (
                filteredAirlines.map((airline) => {
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
                              {airline.rbd_count || 0} RBDs
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
                              <h4 className="text-sm font-medium">RBD Management</h4>
                              <div className="text-sm text-muted-foreground">
                                Click "Manage RBDs" to view and configure booking class assignments for this airline.
                              </div>
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
            refetchAirlines(); // Refresh to update RBD counts
          }}
        />
      )}
    </Card>
  );
}