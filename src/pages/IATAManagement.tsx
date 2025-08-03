import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Download, Upload } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { AirlineManagement } from "@/components/AirlineManagement";
import { AirportManagement } from "@/components/AirportManagement";
import { BookingClassManagement } from "@/components/BookingClassManagement";

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
            Manage airline codes, airport codes, and booking classes
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
                placeholder="Search airlines, airports, or booking classes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Management Tabs */}
      <Tabs defaultValue="airlines" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="airlines">Airlines</TabsTrigger>
          <TabsTrigger value="airports">Airports</TabsTrigger>
          <TabsTrigger value="booking-classes">Booking Classes</TabsTrigger>
        </TabsList>

        <TabsContent value="airlines" className="space-y-6">
          <AirlineManagement searchTerm={searchTerm} />
        </TabsContent>

        <TabsContent value="airports" className="space-y-6">
          <AirportManagement searchTerm={searchTerm} />
        </TabsContent>

        <TabsContent value="booking-classes" className="space-y-6">
          <BookingClassManagement searchTerm={searchTerm} />
        </TabsContent>
      </Tabs>
    </div>
  );
}