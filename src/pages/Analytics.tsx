import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ComprehensiveAnalytics } from "@/components/analytics/ComprehensiveAnalytics";

const Analytics = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  // Handle URL parameters for filtering
  useEffect(() => {
    const view = searchParams.get('view');
    const role = searchParams.get('role');
    const metric = searchParams.get('metric');
    
    if (view && role) {
      console.log(`Analytics filtering: view=${view}, role=${role}, metric=${metric}`);
      // This would be passed to the ComprehensiveAnalytics component for filtering
    }
  }, [searchParams]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto p-6">
      <ComprehensiveAnalytics />
    </div>
  );
};

export default Analytics;