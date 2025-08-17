import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Mail } from "lucide-react";

const BasicEmails = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Emails</h1>
        <Mail className="h-6 w-6 text-muted-foreground" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Email Center</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Email management coming soon.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default BasicEmails;