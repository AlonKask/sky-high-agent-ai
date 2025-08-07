import { useState, useCallback, useEffect, useMemo } from "react";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Pencil, Trash2, Plus, Search, ChevronDown, ChevronRight, MapPin } from "lucide-react";
import { useAirports, useAirportMutations, useDebouncedSearch, type Airport } from "@/hooks/useIATAData";

interface OptimizedAirportManagementProps {
  searchTerm: string;
}

export default function OptimizedAirportManagement({ searchTerm }: OptimizedAirportManagementProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAirport, setEditingAirport] = useState<Airport | null>(null);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  const [collapsedCities, setCollapsedCities] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    iata_code: "",
    icao_code: "",
    name: "",
    city: "",
    country: "",
    latitude: "",
    longitude: "",
    timezone: "",
    priority: "1"
  });

  const debouncedSearch = useDebouncedSearch();

  // Use optimized query with debounced search
  const { data: airports = [], isLoading, error } = useAirports(debouncedSearchTerm);
  const { createAirport, updateAirport, deleteAirport } = useAirportMutations();

  // Group airports by city for better organization
  const groupedAirports = useMemo(() => {
    const groups: Record<string, Airport[]> = {};
    airports.forEach(airport => {
      const city = airport.city || 'Unknown City';
      if (!groups[city]) {
        groups[city] = [];
      }
      groups[city].push(airport);
    });

    // Sort airports within each city by priority (DESC) then name
    Object.keys(groups).forEach(city => {
      groups[city].sort((a, b) => {
        if (a.priority !== b.priority) {
          return (b.priority || 1) - (a.priority || 1);
        }
        return a.name.localeCompare(b.name);
      });
    });

    return groups;
  }, [airports]);

  const toggleCity = (city: string) => {
    setCollapsedCities(prev => {
      const newSet = new Set(prev);
      if (newSet.has(city)) {
        newSet.delete(city);
      } else {
        newSet.add(city);
      }
      return newSet;
    });
  };

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
      priority: "1"
    });
    setEditingAirport(null);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    const airportData = {
      ...formData,
      latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
      longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
      priority: parseInt(formData.priority) || 1
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
      priority: airport.priority?.toString() || "1"
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
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Airports Management
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {isLoading ? "Loading..." : `${airports.length} airports`}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {Object.keys(groupedAirports).length} cities
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
              <div className="grid grid-cols-3 gap-4">
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
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Input
                    id="priority"
                    type="number"
                    min="1"
                    max="10"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    placeholder="1-10"
                    disabled={isSubmitting}
                  />
                  <div className="text-xs text-muted-foreground">
                    Higher = more important (main airports = 3+)
                  </div>
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
        
        <div className="space-y-4">
          {isLoading ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Priority</TableHead>
                    <TableHead>IATA</TableHead>
                    <TableHead>ICAO</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Coordinates</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 10 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : airports.length > 0 ? (
            Object.entries(groupedAirports).sort(([a], [b]) => a.localeCompare(b)).map(([city, cityAirports]) => (
              <Collapsible key={city} open={!collapsedCities.has(city)}>
                <CollapsibleTrigger 
                  className="flex items-center gap-2 w-full p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                  onClick={() => toggleCity(city)}
                >
                  {collapsedCities.has(city) ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{city}</h3>
                      <Badge variant="outline" className="text-xs">
                        {cityAirports.length} airport{cityAirports.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {cityAirports[0]?.country}
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2 rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Priority</TableHead>
                          <TableHead>IATA Code</TableHead>
                          <TableHead>ICAO Code</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Coordinates</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cityAirports.map((airport) => (
                          <TableRow key={airport.id}>
                            <TableCell>
                              <Badge 
                                variant={airport.priority && airport.priority >= 3 ? "default" : airport.priority && airport.priority >= 2 ? "secondary" : "outline"}
                                className="text-xs"
                              >
                                {airport.priority || 1}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono font-medium">
                              {airport.iata_code}
                            </TableCell>
                            <TableCell className="font-mono text-muted-foreground">
                              {airport.icao_code || "-"}
                            </TableCell>
                            <TableCell className="max-w-xs truncate" title={airport.name}>
                              {airport.name}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {airport.latitude && airport.longitude ? 
                                `${airport.latitude.toFixed(2)}, ${airport.longitude.toFixed(2)}` : 
                                'N/A'
                              }
                            </TableCell>
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
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? "No airports found matching your search." : "No airports found. Add your first airport to get started."}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}