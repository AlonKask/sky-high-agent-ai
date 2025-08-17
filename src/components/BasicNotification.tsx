import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

export const BasicNotification = () => {
  return (
    <div className="absolute top-4 right-4 z-50">
      <Button variant="outline" size="icon">
        <Bell className="h-4 w-4" />
      </Button>
    </div>
  );
};