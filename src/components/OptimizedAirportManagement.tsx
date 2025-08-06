import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, Trash2, Plus, Search } from "lucide-react";
import { useAirports, useAirportMutations, useDebouncedSearch, type Airport } from "@/hooks/useIATAData";

interface OptimizedAirportManagementProps {
  searchTerm: string;
}

export default function OptimizedAirportManagement({ searchTerm }: OptimizedAirportManagementProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAirport, setEditingAirport] = useState<Airport | null>(null);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  const [formData, setFormData] = useState({
    iata_code: "",
    icao_code: "",
    name: "",
    city: "",
    country: "",
    latitude: "",
    longitude: "",
    timezone: "",
  });

  const debouncedSearch = useDebouncedSearch();

  // Use optimized query with debounced search
  const { data: airports = [], isLoading, error } = useAirports(debouncedSearchTerm || undefined);
  const { createAirport, updateAirport, deleteAirport } = useAirportMutations();

  // Debounce search updates
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const resetForm = useCallback(() => {
    setFormData({
      iata_code: "",
      icao_code: "",
      name: "",
      city: "",
      country: "",
      latitude: "",
      longitude: "",
      timezone: "",
    });
    setEditingAirport(null);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    const airportData = {
      ...formData,
      latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
      longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
    };

    if (editingAirport) {
      await updateAirport.mutateAsync({ id: editingAirport.id, ...airportData });
    } else {
      await createAirport.mutateAsync(airportData);
    }

    setIsDialogOpen(false);
    resetForm();
  }, [formData, editingAirport, createAirport, updateAirport, resetForm]);

  const handleEdit = useCallback((airport: Airport) => {
    setEditingAirport(airport);
    setFormData({
      iata_code: airport.iata_code,
      icao_code: airport.icao_code || "",
      name: airport.name,
      city: airport.city,
      country: airport.country,
      latitude: airport.latitude?.toString() || "",
      longitude: airport.longitude?.toString() || "",
      timezone: airport.timezone || "",
    });
    setIsDialogOpen(true);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    if (confirm("Are you sure you want to delete this airport?")) {
      await deleteAirport.mutateAsync(id);
    }
  }, [deleteAirport]);

  const isSubmitting = createAirport.isPending || updateAirport.isPending;

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-destructive">
            Error loading airports: {error.message}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CardTitle>Airports Management</CardTitle>
          <Badge variant="secondary" className="text-xs">
            {isLoading ? "Loading..." : `${airports.length} records`}
          </Badge>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Add Airport
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
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
                    onChange={(e) => setFormData({ ...formData, iata_code: e.target.value.toUpperCase() })}
                    placeholder="JFK"
                    maxLength={3}
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="icao_code">ICAO Code</Label>
                  <Input
                    id="icao_code"
                    value={formData.icao_code}
                    onChange={(e) => setFormData({ ...formData, icao_code: e.target.value.toUpperCase() })}
                    placeholder="KJFK"
                    maxLength={4}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="name">Airport Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John F. Kennedy International Airport"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="New York"
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="country">Country *</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    placeholder="United States"
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="latitude">Latitude</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="any"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    placeholder="40.6413"
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="longitude">Longitude</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="any"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    placeholder="-73.7781"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="timezone">Timezone</Label>
                <Input
                  id="timezone"
                  value={formData.timezone}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                  placeholder="America/New_York"
                  disabled={isSubmitting}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : editingAirport ? "Update" : "Add"} Airport
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {searchTerm && !debouncedSearchTerm && (
          <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Search className="h-4 w-4" />
            Searching...
          </div>
        )}
        
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
              {isLoading ? (
                Array.from({ length: 10 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  </TableRow>
                ))
              ) : airports.length > 0 ? (
                airports.map((airport) => (
                  <TableRow key={airport.id}>
                    <TableCell className="font-mono font-medium">
                      {airport.iata_code}
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground">
                      {airport.icao_code || "—"}
                    </TableCell>
                    <TableCell className="max-w-xs truncate" title={airport.name}>
                      {airport.name}
                    </TableCell>
                    <TableCell>{airport.city}</TableCell>
                    <TableCell>{airport.country}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(airport)}
                          disabled={isSubmitting}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(airport.id)}
                          disabled={deleteAirport.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    {searchTerm ? "No airports found matching your search." : "No airports found."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}