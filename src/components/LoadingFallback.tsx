import { LoadingSpinner } from "@/components/LoadingSpinner";

export const LoadingFallback = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <LoadingSpinner />
        <p className="text-muted-foreground">Loading application...</p>
      </div>
    </div>
  );
};