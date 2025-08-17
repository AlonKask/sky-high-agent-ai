import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useSimpleAuth } from "@/hooks/useSimpleAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

const BasicNewRequest = () => {
  const { user } = useSimpleAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    client_id: "",
    request_type: "flight",
    origin: "",
    destination: "",
    departure_date: "",
    return_date: "",
    adults_count: 1,
    children_count: 0,
    infants_count: 0,
    class_preference: "business",
    budget_range: "",
    special_requirements: "",
    priority: "medium"
  });

  useEffect(() => {
    if (user) {
      fetchClients();
    }
  }, [user]);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, first_name, last_name, email')
        .order('first_name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load clients",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('requests')
        .insert([{
          ...formData,
          user_id: user.id,
          passengers: formData.adults_count + formData.children_count + formData.infants_count,
          status: 'pending'
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Request created successfully"
      });
      navigate("/requests");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create request",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link to="/requests">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Requests
          </Link>
        </Button>
        <h1 className="text-3xl font-bold text-foreground">New Request</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create New Travel Request</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Client</label>
                <Select value={formData.client_id} onValueChange={(value) => setFormData({...formData, client_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.first_name} {client.last_name} ({client.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Request Type</label>
                <Select value={formData.request_type} onValueChange={(value) => setFormData({...formData, request_type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flight">Flight</SelectItem>
                    <SelectItem value="hotel">Hotel</SelectItem>
                    <SelectItem value="package">Package</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Origin</label>
                <Input
                  value={formData.origin}
                  onChange={(e) => setFormData({...formData, origin: e.target.value})}
                  placeholder="e.g., New York, NY"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Destination</label>
                <Input
                  value={formData.destination}
                  onChange={(e) => setFormData({...formData, destination: e.target.value})}
                  placeholder="e.g., London, UK"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Departure Date</label>
                <Input
                  type="date"
                  value={formData.departure_date}
                  onChange={(e) => setFormData({...formData, departure_date: e.target.value})}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Return Date (Optional)</label>
                <Input
                  type="date"
                  value={formData.return_date}
                  onChange={(e) => setFormData({...formData, return_date: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Adults</label>
                <Input
                  type="number"
                  min="1"
                  value={formData.adults_count}
                  onChange={(e) => setFormData({...formData, adults_count: parseInt(e.target.value) || 1})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Children</label>
                <Input
                  type="number"
                  min="0"
                  value={formData.children_count}
                  onChange={(e) => setFormData({...formData, children_count: parseInt(e.target.value) || 0})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Class Preference</label>
                <Select value={formData.class_preference} onValueChange={(value) => setFormData({...formData, class_preference: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="economy">Economy</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="first">First</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Priority</label>
                <Select value={formData.priority} onValueChange={(value) => setFormData({...formData, priority: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Budget Range</label>
              <Input
                value={formData.budget_range}
                onChange={(e) => setFormData({...formData, budget_range: e.target.value})}
                placeholder="e.g., $5,000 - $10,000"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Special Requirements</label>
              <Textarea
                value={formData.special_requirements}
                onChange={(e) => setFormData({...formData, special_requirements: e.target.value})}
                placeholder="Any special requirements or preferences..."
                rows={3}
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={submitting || !formData.client_id}>
                {submitting ? "Creating..." : "Create Request"}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link to="/requests">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default BasicNewRequest;