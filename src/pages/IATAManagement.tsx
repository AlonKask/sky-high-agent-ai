import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Download, Upload } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { AirlineManagement } from "@/components/AirlineManagement";
import OptimizedAirportManagement from "@/components/OptimizedAirportManagement";
import AircraftManagement from "@/components/AircraftManagement";


export default function IATAManagement() {
  const { canAccess } = usePermissions();
  const [searchTerm, setSearchTerm] = useState("");

  if (!canAccess('iata_management', 'view')) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-muted-foreground">Access Denied</h2>
              <p className="text-sm text-muted-foreground mt-2">
                You don't have permission to access IATA Management.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">IATA Codes Management</h1>
          <p className="text-muted-foreground">
            Manage airline codes with integrated RBDs, airport codes, and aircraft models
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Admin/Manager Access</Badge>
        </div>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search airlines, airports, or aircraft models..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="text-xs">
                Real-time search
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Management Tabs - Now includes Aircraft Models */}
      <Tabs defaultValue="airlines" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="airlines">Airlines & RBDs</TabsTrigger>
          <TabsTrigger value="airports">Airports</TabsTrigger>
          <TabsTrigger value="aircraft">Aircraft Models</TabsTrigger>
        </TabsList>

        <TabsContent value="airlines" className="space-y-6">
          <AirlineManagement searchTerm={searchTerm} />
        </TabsContent>

        <TabsContent value="airports" className="space-y-6">
          <OptimizedAirportManagement searchTerm={searchTerm} />
        </TabsContent>

        <TabsContent value="aircraft" className="space-y-6">
          <AircraftManagement searchTerm={searchTerm} />
        </TabsContent>
      </Tabs>
    </div>
  );
}