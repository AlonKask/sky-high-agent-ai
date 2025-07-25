import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Calendar, DollarSign, Info, Copy } from "lucide-react";
interface SabreCommandTemplatesProps {
  onTemplateSelect: (command: string) => void;
}
const SabreCommandTemplates = ({
  onTemplateSelect
}: SabreCommandTemplatesProps) => {
  const templates = [{
    category: "Availability",
    icon: <Search className="h-4 w-4" />,
    commands: [{
      name: "Basic Availability",
      command: "1*15MARLHRAA",
      description: "Date/Route availability search"
    }, {
      name: "Flexible Dates",
      command: "1*15-17MARLHRAA",
      description: "3-day window search"
    }, {
      name: "Class Specific",
      command: "1*15MARLHRCAA",
      description: "Business class availability"
    }]
  }, {
    category: "Pricing",
    icon: <DollarSign className="h-4 w-4" />,
    commands: [{
      name: "Price Itinerary",
      command: "WP*",
      description: "Price current itinerary"
    }, {
      name: "Price with Tax",
      command: "WP*TAX",
      description: "Price with all taxes"
    }, {
      name: "Lowest Fare",
      command: "WP*L",
      description: "Lowest available fare"
    }]
  }, {
    category: "Schedule",
    icon: <Calendar className="h-4 w-4" />,
    commands: [{
      name: "Schedule Display",
      command: "*SG15MARLHR",
      description: "Flight schedules"
    }, {
      name: "Equipment Info",
      command: "*SG15MARLHR/E",
      description: "Aircraft equipment details"
    }, {
      name: "Meal Service",
      command: "*SG15MARLHR/M",
      description: "Meal service information"
    }]
  }, {
    category: "Information",
    icon: <Info className="h-4 w-4" />,
    commands: [{
      name: "Fare Rules",
      command: "RD*",
      description: "Display fare rules"
    }, {
      name: "Airport Info",
      command: "*A/LHR",
      description: "Airport information"
    }, {
      name: "Airline Info",
      command: "*AL/BA",
      description: "Airline details"
    }]
  }];
  const quickCodes = [{
    type: "Airports",
    codes: ["JFK", "LHR", "CDG", "DXB", "NRT", "LAX", "SIN", "FRA"]
  }, {
    type: "Airlines",
    codes: ["BA", "AA", "LH", "EK", "AF", "DL", "UA", "VS"]
  }, {
    type: "Classes",
    codes: ["F", "C", "J", "W", "Y", "B", "M", "H"]
  }];
  return;
};
export default SabreCommandTemplates;