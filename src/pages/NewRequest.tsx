import { useAuth } from "@/hooks/useAuthOptimized";
import { Navigate } from "react-router-dom";
import { LoadingFallback } from "@/components/LoadingFallback";
import RequestCreationForm from "@/components/RequestCreationForm";

const NewRequest = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingFallback />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <RequestCreationForm />;
};

export default NewRequest;