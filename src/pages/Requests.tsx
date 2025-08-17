import { useAuth } from "@/hooks/useAuthOptimized";
import { Navigate, useSearchParams } from "react-router-dom";
import { useEffect } from "react";
import EnhancedRequestManager from "@/components/EnhancedRequestManager";
import { LoadingFallback } from "@/components/LoadingFallback";

const Requests = () => {
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();

  // Handle URL parameters for filtering
  useEffect(() => {
    const status = searchParams.get('status');
    const assignmentStatus = searchParams.get('assignment_status');
    const assignedTo = searchParams.get('assigned_to');
    
    if (status || assignmentStatus || assignedTo) {
      console.log(`Requests filtering: status=${status}, assignment_status=${assignmentStatus}, assigned_to=${assignedTo}`);
      // This would be passed to the EnhancedRequestManager component for filtering
    }
  }, [searchParams]);

  if (loading) {
    return <LoadingFallback />;
  }

  if (!user) {
    console.log('Requests page: No user, redirecting to auth');
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="container mx-auto p-6">
      <EnhancedRequestManager />
    </div>
  );
};

export default Requests;