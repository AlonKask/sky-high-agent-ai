import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Settings as SettingsIcon } from "lucide-react";

const BasicSettings = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <SettingsIcon className="h-6 w-6 text-muted-foreground" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Settings configuration coming soon.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default BasicSettings;