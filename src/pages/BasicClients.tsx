import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

const BasicClients = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Clients</h1>
        <Button>
          <PlusCircle className="w-4 h-4 mr-2" />
          Add Client
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Client List</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No clients found. Add your first client to get started.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default BasicClients;