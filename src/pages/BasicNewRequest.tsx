import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const BasicNewRequest = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link to="/requests">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Requests
          </Link>
        </Button>
        <h1 className="text-3xl font-bold text-foreground">New Request</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create New Travel Request</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Request creation form coming soon.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default BasicNewRequest;