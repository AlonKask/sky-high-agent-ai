import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateCardProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const EmptyStateCard = ({ 
  title, 
  description, 
  actionLabel, 
  onAction,
  icon = <AlertCircle className="h-8 w-8 text-muted-foreground" />
}: EmptyStateCardProps) => {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-8 text-center">
        {icon}
        <h3 className="text-lg font-semibold mt-4">{title}</h3>
        <p className="text-muted-foreground mt-2 max-w-sm">{description}</p>
        {actionLabel && onAction && (
          <Button 
            onClick={onAction} 
            className="mt-4"
            variant="outline"
          >
            <Plus className="h-4 w-4 mr-2" />
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};