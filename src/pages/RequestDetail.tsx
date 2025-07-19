
import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import RequestInformation from "@/components/RequestInformation";
import SabreOptionManager from "@/components/SabreOptionManager";

interface SabreOption {
  id: string;
  format: "I" | "VI";
  content: string;
  status: "draft" | "quoted" | "selected" | "expired";
  quoteType: "award" | "revenue";
  // Revenue fields
  fareType?: "tour_fare" | "private" | "published";
  numberOfBags?: number;
  weightOfBags?: number;
  // Award fields
  awardProgram?: string;
  // Pricing fields
  netPrice?: number;
  markup?: number;
  minimumMarkup?: number;
  issuingFee?: number;
  ckFees?: boolean;
  sellingPrice?: number;
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


  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Request Details</h1>
          <p className="text-muted-foreground">Complete information for request {requestId}</p>
        </div>
      </div>

      <div className="space-y-6">
        <RequestInformation request={request} />
        
        <SabreOptionManager
          options={sabreOptions}
          onAddOption={handleAddOption}
          onUpdateOption={handleUpdateOption}
          onDeleteOption={handleDeleteOption}
        />
      </div>
    </div>
  );
};

export default RequestDetail;
