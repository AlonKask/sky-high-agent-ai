
import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import RequestInformation from "@/components/RequestInformation";
import SabreOptionManager from "@/components/SabreOptionManager";
import SabreCommandTemplates from "@/components/SabreCommandTemplates";

interface SabreOption {
  id: string;
  format: "I" | "VI";
  content: string;
  status: "draft" | "quoted" | "selected" | "expired";
  price?: string;
  validUntil?: string;
  notes?: string;
  createdAt: string;
}

const RequestDetail = () => {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const [sabreOptions, setSabreOptions] = useState<SabreOption[]>([]);

  // Mock request data - in real app this would come from API/database
  const request = {
    id: requestId,
    type: "Round Trip",
    status: "active",
    priority: "high",
    segments: [
      {
        from: "New York JFK",
        to: "London LHR", 
        date: "2024-03-20",
        passengers: { adults: 2, children: 0, infants: 0 }
      },
      {
        from: "London LHR",
        to: "New York JFK",
        date: "2024-03-27",
        passengers: { adults: 2, children: 0, infants: 0 }
      }
    ],
    clientName: "John Smith",
    requestDate: "2024-01-15",
    notes: "Business class preferred, vegetarian meals"
  };

  const handleAddOption = (option: Omit<SabreOption, 'id' | 'createdAt'>) => {
    const newOption: SabreOption = {
      ...option,
      id: `OPT-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setSabreOptions([...sabreOptions, newOption]);
  };

  const handleUpdateOption = (id: string, updates: Partial<SabreOption>) => {
    setSabreOptions(options => 
      options.map(option => 
        option.id === id ? { ...option, ...updates } : option
      )
    );
  };

  const handleDeleteOption = (id: string) => {
    setSabreOptions(options => options.filter(option => option.id !== id));
  };

  const handleTemplateSelect = (template: string) => {
    // This could be enhanced to insert into a form field
    console.log("Template selected:", template);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Request Details</h1>
          <p className="text-muted-foreground">Complete information for request {requestId}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <RequestInformation request={request} />
        </div>

        <div className="space-y-6">
          <Tabs defaultValue="options" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="options">Options</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
            </TabsList>
            
            <TabsContent value="options" className="space-y-4">
              <SabreOptionManager
                options={sabreOptions}
                onAddOption={handleAddOption}
                onUpdateOption={handleUpdateOption}
                onDeleteOption={handleDeleteOption}
              />
            </TabsContent>
            
            <TabsContent value="templates" className="space-y-4">
              <SabreCommandTemplates onTemplateSelect={handleTemplateSelect} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default RequestDetail;
