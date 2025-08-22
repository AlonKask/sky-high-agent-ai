import { useState } from "react";
import { Plane, Plus, Edit, Trash2, ExternalLink } from "lucide-react";
import { useAircraftModels, useAircraftModelMutations } from "@/hooks/useIATAData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";

interface AircraftManagementProps {
  searchTerm: string;
}

const AIRCRAFT_CATEGORIES = [
  "Widebody Jet",
  "Narrowbody Jet", 
  "Regional Jet",
  "Turboprop"
];

const getCategoryColor = (category: string) => {
  switch (category) {
    case "Widebody Jet": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
    case "Narrowbody Jet": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
    case "Regional Jet": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
    case "Turboprop": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
    default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
  }
};

export default function AircraftManagement({ searchTerm }: AircraftManagementProps) {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [editingAircraft, setEditingAircraft] = useState<any>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newAircraft, setNewAircraft] = useState({
    code: "",
    aliases: "",
    display_label: "",
    manufacturer: "",
    family: "",
    model: "",
    category: "",
    icon_url: ""
  });

  const { data: aircraftModels, isLoading } = useAircraftModels(searchTerm);
  const { createAircraftModel, updateAircraftModel, deleteAircraftModel } = useAircraftModelMutations();

  const filteredAircraft = aircraftModels?.filter(aircraft => 
    selectedCategory === "all" || aircraft.category === selectedCategory
  ) || [];

  const handleSaveAircraft = async (aircraftData: any) => {
    try {
      const formattedData = {
        ...aircraftData,
        aliases: typeof aircraftData.aliases === 'string' 
          ? aircraftData.aliases.split(',').map((alias: string) => alias.trim()).filter(Boolean)
          : aircraftData.aliases
      };

      if (editingAircraft) {
        await updateAircraftModel.mutateAsync({ id: editingAircraft.id, ...formattedData });
        setEditingAircraft(null);
      } else {
        await createAircraftModel.mutateAsync(formattedData);
        setIsAddDialogOpen(false);
        setNewAircraft({
          code: "",
          aliases: "",
          display_label: "",
          manufacturer: "",
          family: "",
          model: "",
          category: "",
          icon_url: ""
        });
      }
    } catch (error) {
      console.error('Error saving aircraft:', error);
    }
  };

  const handleDeleteAircraft = async (aircraftId: string) => {
    if (window.confirm('Are you sure you want to delete this aircraft model?')) {
      try {
        await deleteAircraftModel.mutateAsync(aircraftId);
      } catch (error) {
        console.error('Error deleting aircraft:', error);
      }
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {AIRCRAFT_CATEGORIES.map(category => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="secondary">
            {filteredAircraft.length} aircraft models
          </Badge>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Aircraft Model
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Aircraft Model</DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="code">Aircraft Code</Label>
                <Input
                  id="code"
                  value={newAircraft.code}
                  onChange={(e) => setNewAircraft(prev => ({ ...prev, code: e.target.value }))}
                  placeholder="e.g., 738, A320"
                />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={newAircraft.category} onValueChange={(value) => setNewAircraft(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {AIRCRAFT_CATEGORIES.map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label htmlFor="display_label">Display Label</Label>
                <Input
                  id="display_label"
                  value={newAircraft.display_label}
                  onChange={(e) => setNewAircraft(prev => ({ ...prev, display_label: e.target.value }))}
                  placeholder="e.g., Boeing 737-800"
                />
              </div>
              <div>
                <Label htmlFor="manufacturer">Manufacturer</Label>
                <Input
                  id="manufacturer"
                  value={newAircraft.manufacturer}
                  onChange={(e) => setNewAircraft(prev => ({ ...prev, manufacturer: e.target.value }))}
                  placeholder="e.g., Boeing, Airbus"
                />
              </div>
              <div>
                <Label htmlFor="family">Family</Label>
                <Input
                  id="family"
                  value={newAircraft.family}
                  onChange={(e) => setNewAircraft(prev => ({ ...prev, family: e.target.value }))}
                  placeholder="e.g., 737NG, A320 family"
                />
              </div>
              <div>
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  value={newAircraft.model}
                  onChange={(e) => setNewAircraft(prev => ({ ...prev, model: e.target.value }))}
                  placeholder="e.g., 737-800, A320-200"
                />
              </div>
              <div>
                <Label htmlFor="icon_url">Icon URL (Optional)</Label>
                <Input
                  id="icon_url"
                  value={newAircraft.icon_url}
                  onChange={(e) => setNewAircraft(prev => ({ ...prev, icon_url: e.target.value }))}
                  placeholder="https://example.com/aircraft-icon.png"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="aliases">Aliases (comma-separated)</Label>
                <Textarea
                  id="aliases"
                  value={newAircraft.aliases}
                  onChange={(e) => setNewAircraft(prev => ({ ...prev, aliases: e.target.value }))}
                  placeholder="e.g., B738, 737-800, 73H"
                  rows={2}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => handleSaveAircraft(newAircraft)} disabled={!newAircraft.code || !newAircraft.display_label}>
                Add Aircraft Model
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plane className="h-5 w-5" />
            Aircraft Models
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Aircraft</TableHead>
                <TableHead>Manufacturer</TableHead>
                <TableHead>Family</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Aliases</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAircraft.map((aircraft) => (
                <TableRow key={aircraft.id}>
                  <TableCell className="font-mono font-semibold">{aircraft.code}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {aircraft.icon_url ? (
                        <img src={aircraft.icon_url} alt={aircraft.display_label} className="h-6 w-6" />
                      ) : (
                        <Plane className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span>{aircraft.display_label}</span>
                    </div>
                  </TableCell>
                  <TableCell>{aircraft.manufacturer}</TableCell>
                  <TableCell>{aircraft.family}</TableCell>
                  <TableCell>
                    <Badge className={getCategoryColor(aircraft.category)}>
                      {aircraft.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {aircraft.aliases?.slice(0, 3).map((alias) => (
                        <Badge key={alias} variant="outline" className="text-xs">
                          {alias}
                        </Badge>
                      ))}
                      {aircraft.aliases && aircraft.aliases.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{aircraft.aliases.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingAircraft(aircraft)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteAircraft(aircraft.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                      {aircraft.icon_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(aircraft.icon_url, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingAircraft} onOpenChange={() => setEditingAircraft(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Aircraft Model</DialogTitle>
          </DialogHeader>
          
          {editingAircraft && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-code">Aircraft Code</Label>
                <Input
                  id="edit-code"
                  value={editingAircraft.code}
                  onChange={(e) => setEditingAircraft(prev => ({ ...prev, code: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-category">Category</Label>
                <Select value={editingAircraft.category} onValueChange={(value) => setEditingAircraft(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AIRCRAFT_CATEGORIES.map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label htmlFor="edit-display-label">Display Label</Label>
                <Input
                  id="edit-display-label"
                  value={editingAircraft.display_label}
                  onChange={(e) => setEditingAircraft(prev => ({ ...prev, display_label: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-manufacturer">Manufacturer</Label>
                <Input
                  id="edit-manufacturer"
                  value={editingAircraft.manufacturer}
                  onChange={(e) => setEditingAircraft(prev => ({ ...prev, manufacturer: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-family">Family</Label>
                <Input
                  id="edit-family"
                  value={editingAircraft.family}
                  onChange={(e) => setEditingAircraft(prev => ({ ...prev, family: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-model">Model</Label>
                <Input
                  id="edit-model"
                  value={editingAircraft.model}
                  onChange={(e) => setEditingAircraft(prev => ({ ...prev, model: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-icon-url">Icon URL</Label>
                <Input
                  id="edit-icon-url"
                  value={editingAircraft.icon_url || ''}
                  onChange={(e) => setEditingAircraft(prev => ({ ...prev, icon_url: e.target.value }))}
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="edit-aliases">Aliases (comma-separated)</Label>
                <Textarea
                  id="edit-aliases"
                  value={Array.isArray(editingAircraft.aliases) ? editingAircraft.aliases.join(', ') : editingAircraft.aliases}
                  onChange={(e) => setEditingAircraft(prev => ({ ...prev, aliases: e.target.value }))}
                  rows={2}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setEditingAircraft(null)}>Cancel</Button>
            <Button onClick={() => handleSaveAircraft(editingAircraft)}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}