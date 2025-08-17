import { useAuth } from "@/hooks/useAuth";
import { Navigate, useSearchParams } from "react-router-dom";
import { useEffect } from "react";
import EnhancedClientManager from "@/components/EnhancedClientManager";

const Clients = () => {
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();

  // Handle URL parameters for filtering
  useEffect(() => {
    const status = searchParams.get('status');
    
    if (status === 'follow-up') {
      console.log('Filtering clients needing follow-up');
      // This would be passed to the EnhancedClientManager component for filtering
    }
  }, [searchParams]);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="container mx-auto p-6">
      <EnhancedClientManager />
    </div>
  );
};

export default Clients;