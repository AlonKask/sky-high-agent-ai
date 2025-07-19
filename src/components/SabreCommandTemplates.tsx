
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Calendar, DollarSign, Info, Copy } from "lucide-react";

interface SabreCommandTemplatesProps {
  onTemplateSelect: (command: string) => void;
}

const SabreCommandTemplates = ({ onTemplateSelect }: SabreCommandTemplatesProps) => {
  const templates = [
    {
      category: "Availability",
      icon: <Search className="h-4 w-4" />,
      commands: [
        { name: "Basic Availability", command: "1*15MARLHRAA", description: "Date/Route availability search" },
        { name: "Flexible Dates", command: "1*15-17MARLHRAA", description: "3-day window search" },
        { name: "Class Specific", command: "1*15MARLHRCAA", description: "Business class availability" }
      ]
    },
    {
      category: "Pricing",
      icon: <DollarSign className="h-4 w-4" />,
      commands: [
        { name: "Price Itinerary", command: "WP*", description: "Price current itinerary" },
        { name: "Price with Tax", command: "WP*TAX", description: "Price with all taxes" },
        { name: "Lowest Fare", command: "WP*L", description: "Lowest available fare" }
      ]
    },
    {
      category: "Schedule",
      icon: <Calendar className="h-4 w-4" />,
      commands: [
        { name: "Schedule Display", command: "*SG15MARLHR", description: "Flight schedules" },
        { name: "Equipment Info", command: "*SG15MARLHR/E", description: "Aircraft equipment details" },
        { name: "Meal Service", command: "*SG15MARLHR/M", description: "Meal service information" }
      ]
    },
    {
      category: "Information",
      icon: <Info className="h-4 w-4" />,
      commands: [
        { name: "Fare Rules", command: "RD*", description: "Display fare rules" },
        { name: "Airport Info", command: "*A/LHR", description: "Airport information" },
        { name: "Airline Info", command: "*AL/BA", description: "Airline details" }
      ]
    }
  ];

  const quickCodes = [
    { type: "Airports", codes: ["JFK", "LHR", "CDG", "DXB", "NRT", "LAX", "SIN", "FRA"] },
    { type: "Airlines", codes: ["BA", "AA", "LH", "EK", "AF", "DL", "UA", "VS"] },
    { type: "Classes", codes: ["F", "C", "J", "W", "Y", "B", "M", "H"] }
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Command Templates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {templates.map((category) => (
            <div key={category.category} className="space-y-2">
              <div className="flex items-center space-x-2">
                {category.icon}
                <span className="font-medium text-sm">{category.category}</span>
              </div>
              <div className="space-y-1">
                {category.commands.map((cmd) => (
                  <div key={cmd.name} className="flex items-center justify-between p-2 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-xs">{cmd.name}</div>
                      <div className="text-xs text-muted-foreground">{cmd.description}</div>
                      <code className="text-xs bg-muted px-1 rounded">{cmd.command}</code>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onTemplateSelect(cmd.command)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Quick Codes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {quickCodes.map((group) => (
            <div key={group.type} className="space-y-2">
              <span className="font-medium text-xs">{group.type}</span>
              <div className="flex flex-wrap gap-1">
                {group.codes.map((code) => (
                  <Badge
                    key={code}
                    variant="outline"
                    className="text-xs cursor-pointer hover:bg-accent"
                    onClick={() => onTemplateSelect(code)}
                  >
                    {code}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default SabreCommandTemplates;
