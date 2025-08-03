import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Settings, Plus, Copy, Trash2, Download } from "lucide-react";

interface Airline {
  id: string;
  iata_code: string;
  name: string;
  country?: string;
  alliance?: string;
}

interface RBDTemplate {
  id: string;
  template_name: string;
  airline_type: string;
  template_data: any;
  is_default: boolean;
}

interface RBDAssignment {
  id: string;
  airline_id: string;
  booking_class_code: string;
  service_class: string;
  class_description: string;
  booking_priority: number;
  is_active: boolean;
  effective_from: string;
  effective_until?: string;
}

interface AirlineRBDAssignmentProps {
  airline: Airline;
  onClose: () => void;
}

export const AirlineRBDAssignment: React.FC<AirlineRBDAssignmentProps> = ({ airline, onClose }) => {
  const [templates, setTemplates] = useState<RBDTemplate[]>([]);
  const [assignments, setAssignments] = useState<RBDAssignment[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [customRBD, setCustomRBD] = useState({
    code: '',
    service_class: '',
    description: '',
    priority: 1
  });

  useEffect(() => {
    fetchTemplates();
    fetchAssignments();
  }, [airline.id]);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('airline_rbd_templates')
        .select('*')
        .order('template_name');

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to fetch RBD templates');
    }
  };

  const fetchAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('airline_rbd_assignments')
        .select('*')
        .eq('airline_id', airline.id)
        .order('booking_priority');

      if (error) throw error;
      setAssignments(data || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      toast.error('Failed to fetch RBD assignments');
    }
  };

  const applyTemplate = async () => {
    if (!selectedTemplate) {
      toast.error('Please select a template');
      return;
    }

    setLoading(true);
    try {
      const template = templates.find(t => t.id === selectedTemplate);
      if (!template) throw new Error('Template not found');

      // Clear existing assignments
      await supabase
        .from('airline_rbd_assignments')
        .delete()
        .eq('airline_id', airline.id);

      // Insert new assignments from template
      const newAssignments = template.template_data.map(rbd => ({
        airline_id: airline.id,
        booking_class_code: rbd.code,
        service_class: rbd.service_class,
        class_description: rbd.description,
        booking_priority: rbd.priority,
        is_active: true
      }));

      const { error } = await supabase
        .from('airline_rbd_assignments')
        .insert(newAssignments);

      if (error) throw error;

      await fetchAssignments();
      toast.success(`Applied ${template.template_name} template to ${airline.name}`);
      setSelectedTemplate('');
    } catch (error) {
      console.error('Error applying template:', error);
      toast.error('Failed to apply template');
    } finally {
      setLoading(false);
    }
  };

  const addCustomRBD = async () => {
    if (!customRBD.code || !customRBD.service_class) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('airline_rbd_assignments')
        .insert({
          airline_id: airline.id,
          booking_class_code: customRBD.code.toUpperCase(),
          service_class: customRBD.service_class,
          class_description: customRBD.description || customRBD.service_class,
          booking_priority: customRBD.priority,
          is_active: true
        });

      if (error) throw error;

      await fetchAssignments();
      setCustomRBD({ code: '', service_class: '', description: '', priority: 1 });
      toast.success('RBD added successfully');
    } catch (error: any) {
      console.error('Error adding RBD:', error);
      if (error.code === '23505') {
        toast.error('RBD code already exists for this airline');
      } else {
        toast.error('Failed to add RBD');
      }
    }
  };

  const removeRBD = async (id: string) => {
    try {
      const { error } = await supabase
        .from('airline_rbd_assignments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchAssignments();
      toast.success('RBD removed successfully');
    } catch (error) {
      console.error('Error removing RBD:', error);
      toast.error('Failed to remove RBD');
    }
  };

  const getServiceClassColor = (serviceClass: string) => {
    switch (serviceClass.toLowerCase()) {
      case 'first':
        return 'bg-accent text-accent-foreground border-accent';
      case 'business':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'premium economy':
        return 'bg-secondary text-secondary-foreground border-secondary';
      case 'economy':
        return 'bg-muted text-muted-foreground border-border';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const exportRBDs = () => {
    const csvContent = assignments.map(rbd => 
      `${rbd.booking_class_code},${rbd.service_class},${rbd.class_description},${rbd.booking_priority}`
    ).join('\n');
    
    const blob = new Blob([`Code,Service Class,Description,Priority\n${csvContent}`], 
      { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${airline.iata_code}_RBDs.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const groupedAssignments = assignments.reduce((acc, assignment) => {
    if (!acc[assignment.service_class]) {
      acc[assignment.service_class] = [];
    }
    acc[assignment.service_class].push(assignment);
    return acc;
  }, {} as Record<string, RBDAssignment[]>);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            RBD Assignment - {airline.name} ({airline.iata_code})
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="manage" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="manage">Manage RBDs</TabsTrigger>
            <TabsTrigger value="templates">Apply Template</TabsTrigger>
            <TabsTrigger value="custom">Add Custom</TabsTrigger>
          </TabsList>

          <TabsContent value="manage" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Current RBD Assignments</h3>
              <Button onClick={exportRBDs} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>

            {Object.keys(groupedAssignments).length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  No RBDs assigned to this airline. Use templates or add custom RBDs.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {Object.entries(groupedAssignments).map(([serviceClass, rbds]) => (
                  <Card key={serviceClass}>
                    <CardHeader>
                      <CardTitle className="text-sm">
                        <Badge className={getServiceClassColor(serviceClass)}>
                          {serviceClass} ({rbds.length} codes)
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {rbds.map((rbd) => (
                          <div key={rbd.id} className="flex items-center justify-between p-2 border rounded">
                            <div>
                              <span className="font-mono font-bold">{rbd.booking_class_code}</span>
                              <span className="text-sm text-muted-foreground ml-2">
                                {rbd.class_description}
                              </span>
                            </div>
                            <Button
                              onClick={() => removeRBD(rbd.id)}
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Apply RBD Template</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="template">Select Template</Label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a template..." />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.template_name} ({template.airline_type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedTemplate && (
                  <div className="border rounded p-4">
                    <h4 className="font-semibold mb-2">Template Preview:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {templates.find(t => t.id === selectedTemplate)?.template_data.map((rbd, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                          <span className="font-mono font-bold">{rbd.code}</span>
                          <Badge className={getServiceClassColor(rbd.service_class)} variant="outline">
                            {rbd.service_class}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button 
                  onClick={applyTemplate} 
                  disabled={!selectedTemplate || loading}
                  className="w-full"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Apply Template (This will replace existing RBDs)
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="custom" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Add Custom RBD</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="rbd-code">RBD Code *</Label>
                    <Input
                      id="rbd-code"
                      value={customRBD.code}
                      onChange={(e) => setCustomRBD({...customRBD, code: e.target.value.toUpperCase()})}
                      maxLength={1}
                      className="font-mono"
                      placeholder="Y"
                    />
                  </div>
                  <div>
                    <Label htmlFor="service-class">Service Class *</Label>
                    <Select 
                      value={customRBD.service_class} 
                      onValueChange={(value) => setCustomRBD({...customRBD, service_class: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select class..." />
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
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={customRBD.description}
                    onChange={(e) => setCustomRBD({...customRBD, description: e.target.value})}
                    placeholder="Economy Full Fare"
                  />
                </div>

                <div>
                  <Label htmlFor="priority">Booking Priority</Label>
                  <Input
                    id="priority"
                    type="number"
                    value={customRBD.priority}
                    onChange={(e) => setCustomRBD({...customRBD, priority: parseInt(e.target.value)})}
                    min={1}
                  />
                </div>

                <Button onClick={addCustomRBD} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add RBD
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};