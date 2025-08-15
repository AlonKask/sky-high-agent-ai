import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { LoadingFallback } from "@/components/LoadingFallback";
import RequestManager from "@/components/RequestManager";

const NewRequest = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingFallback />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="container mx-auto p-6">
      <RequestManager />
    </div>
  );
};

export default NewRequest;