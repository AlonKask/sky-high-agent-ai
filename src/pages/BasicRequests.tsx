import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { Link } from "react-router-dom";

const BasicRequests = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Requests</h1>
        <Button asChild>
          <Link to="/requests/new">
            <PlusCircle className="w-4 h-4 mr-2" />
            New Request
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Request List</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No requests found. Create your first request to get started.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default BasicRequests;