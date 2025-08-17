import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClientManagement } from '@/components/ClientManagement';
import { FlightOptionsBuilder } from '@/components/FlightOptionsBuilder';
import { Users, Plane, BarChart, Settings } from 'lucide-react';

const Management = () => {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Management Dashboard</h1>
        <p className="text-muted-foreground">Manage clients, create flight options, and oversee team operations</p>
      </div>

      <Tabs defaultValue="clients" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="clients" className="gap-2">
            <Users className="h-4 w-4" />
            Client Management
          </TabsTrigger>
          <TabsTrigger value="flights" className="gap-2">
            <Plane className="h-4 w-4" />
            Flight Options
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clients">
          <ClientManagement />
        </TabsContent>

        <TabsContent value="flights">
          <FlightOptionsBuilder />
        </TabsContent>

        <TabsContent value="analytics">
          <div className="text-center py-12">
            <BarChart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Analytics Coming Soon</h3>
            <p className="text-muted-foreground">Team performance and booking analytics will be available here.</p>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <div className="text-center py-12">
            <Settings className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Management Settings</h3>
            <p className="text-muted-foreground">Team configuration and system settings will be available here.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Management;