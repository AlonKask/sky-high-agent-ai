
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { RoleDashboard } from "@/components/RoleDashboard";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  console.log('🏠 Index page - user:', user?.id, 'loading:', loading);

  useEffect(() => {
    console.log('🏠 Index useEffect - loading:', loading, 'user:', user?.id);
    if (!loading && !user) {
      console.log('🏠 Redirecting to /auth');
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading) {
    console.log('🏠 Showing loading state');
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading application...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('🏠 No user, showing fallback');
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  console.log('🏠 Rendering RoleDashboard');
  return <RoleDashboard />;
};

export default Index;
