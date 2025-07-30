import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { 
  Plane, 
  ArrowLeft, 
  ArrowRight, 
  Shield, 
  Calendar, 
  RefreshCw,
  CheckCircle,
  Info
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface AddOnSelection {
  travelInsurance: string;
  flexibleTicket: boolean;
  cancelForAnyReason: boolean;
}

const AddOnsProtection = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [selections, setSelections] = useState<AddOnSelection>({
    travelInsurance: "none",
    flexibleTicket: false,
    cancelForAnyReason: false
  });

  const [basePrice] = useState(4357.40);

  const calculateTotal = () => {
    let total = basePrice;
    
    if (selections.travelInsurance === "basic") total += 89;
    if (selections.travelInsurance === "premium") total += 169;
    if (selections.flexibleTicket) total += 100;
    if (selections.cancelForAnyReason) total += 200;
    
    return total;
  };

  const handleContinue = () => {
    localStorage.setItem('addOnSelections', JSON.stringify(selections));
    navigate('/booking/payment');
    toast({
      title: "Add-ons saved",
      description: "Proceeding to payment...",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plane className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">SkyBook</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Progress Indicator */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                ✓
              </div>
              <div className="w-20 h-1 bg-green-500 mx-2"></div>
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                2
              </div>
              <div className="w-20 h-1 bg-muted mx-2"></div>
              <div className="w-8 h-8 bg-muted text-muted-foreground rounded-full flex items-center justify-center text-sm">
                3
              </div>
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold">Step 2 of 3: Enhance Your Trip</h1>
            <p className="text-muted-foreground">Add protection and flexibility to your booking</p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Travel Protection Plans */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Travel Protection Plans
                </CardTitle>
                <p className="text-muted-foreground">
                  Protect your investment with comprehensive travel insurance
                </p>
              </CardHeader>
              <CardContent>
                <RadioGroup 
                  value={selections.travelInsurance} 
                  onValueChange={(value) => setSelections(prev => ({ ...prev, travelInsurance: value }))}
                  className="space-y-4"
                >
                  {/* No Protection */}
                  <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                    <RadioGroupItem value="none" id="none" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="none" className="text-base font-medium cursor-pointer">
                        No Protection
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Continue without travel insurance
                      </p>
                      <div className="mt-2">
                        <Badge variant="outline">Free</Badge>
                      </div>
                    </div>
                  </div>

                  {/* Basic Protection */}
                  <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                    <RadioGroupItem value="basic" id="basic" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="basic" className="text-base font-medium cursor-pointer">
                        Basic Protection
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Essential coverage for peace of mind
                      </p>
                      <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                        <li>• Trip cancellation up to $5,000</li>
                        <li>• Baggage loss up to $1,000</li>
                        <li>• Medical emergency up to $50,000</li>
                        <li>• Trip delay coverage</li>
                      </ul>
                      <div className="mt-2">
                        <Badge variant="secondary">+$89</Badge>
                      </div>
                    </div>
                  </div>

                  {/* Premium Protection */}
                  <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors relative">
                    <RadioGroupItem value="premium" id="premium" className="mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="premium" className="text-base font-medium cursor-pointer">
                          Premium Protection
                        </Label>
                        <Badge className="bg-primary">Recommended</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Comprehensive coverage with higher limits
                      </p>
                      <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                        <li>• Trip cancellation up to $10,000</li>
                        <li>• Baggage loss up to $2,500</li>
                        <li>• Medical emergency up to $100,000</li>
                        <li>• Medical evacuation coverage</li>
                        <li>• Trip interruption protection</li>
                        <li>• 24/7 emergency assistance</li>
                      </ul>
                      <div className="mt-2">
                        <Badge variant="secondary">+$169</Badge>
                      </div>
                    </div>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Additional Options */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Flexibility Options</CardTitle>
                <p className="text-muted-foreground">
                  Add more flexibility to your booking
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Flexible Ticket */}
                <div className="flex items-start space-x-3 p-4 border rounded-lg">
                  <Checkbox 
                    id="flexible"
                    checked={selections.flexibleTicket}
                    onCheckedChange={(checked) => 
                      setSelections(prev => ({ ...prev, flexibleTicket: checked as boolean }))
                    }
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label htmlFor="flexible" className="text-base font-medium cursor-pointer flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Flexible Ticket
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Allows one free date change or rebooking without airline penalties
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Just pay any fare difference if applicable
                    </p>
                    <div className="mt-2">
                      <Badge variant="outline">+$100</Badge>
                    </div>
                  </div>
                </div>

                {/* Cancel for Any Reason */}
                <div className="flex items-start space-x-3 p-4 border rounded-lg">
                  <Checkbox 
                    id="cancel-any-reason"
                    checked={selections.cancelForAnyReason}
                    onCheckedChange={(checked) => 
                      setSelections(prev => ({ ...prev, cancelForAnyReason: checked as boolean }))
                    }
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label htmlFor="cancel-any-reason" className="text-base font-medium cursor-pointer flex items-center gap-2">
                      <RefreshCw className="h-4 w-4" />
                      Cancel For Any Reason
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Cancel your trip for any reason and get 80% refund
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Must cancel at least 48 hours before departure to be eligible
                    </p>
                    <div className="mt-2">
                      <Badge variant="outline">+$200</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Important Note */}
            <Card className="border-blue-200 bg-blue-50/50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-blue-800">
                      <strong>Good to know:</strong> You can still continue without adding any extras. 
                      These options are optional and meant to give you peace of mind for your journey.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => navigate('/booking/passenger-info')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Passenger Info
              </Button>
              <Button onClick={handleContinue} size="lg">
                Continue to Payment
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Booking Summary Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Booking Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="font-medium">Emirates EK 213</div>
                  <div className="text-sm text-muted-foreground">Houston → Lagos</div>
                  <div className="text-sm text-muted-foreground">Jan 10, 2025</div>
                  <div className="text-sm text-muted-foreground">1 Adult, Business Class</div>
                </div>
                
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span>Flight Price</span>
                    <span>$4,200.00</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Taxes & Fees</span>
                    <span>$157.40</span>
                  </div>
                  
                  {/* Add-ons */}
                  {selections.travelInsurance === "basic" && (
                    <div className="flex justify-between text-sm">
                      <span>Basic Protection</span>
                      <span>$89.00</span>
                    </div>
                  )}
                  {selections.travelInsurance === "premium" && (
                    <div className="flex justify-between text-sm">
                      <span>Premium Protection</span>
                      <span>$169.00</span>
                    </div>
                  )}
                  {selections.flexibleTicket && (
                    <div className="flex justify-between text-sm">
                      <span>Flexible Ticket</span>
                      <span>$100.00</span>
                    </div>
                  )}
                  {selections.cancelForAnyReason && (
                    <div className="flex justify-between text-sm">
                      <span>Cancel Any Reason</span>
                      <span>$200.00</span>
                    </div>
                  )}
                </div>
                
                <div className="border-t pt-4">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>${calculateTotal().toFixed(2)}</span>
                  </div>
                </div>

                {/* 24hr Cancellation Notice */}
                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 text-green-800">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Free 24-hour cancellation</span>
                  </div>
                  <p className="text-xs text-green-700 mt-1">
                    Cancel within 24 hours of booking for a full refund
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AddOnsProtection;