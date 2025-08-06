import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import EnhancedBookingManager from "@/components/EnhancedBookingManager";

const Bookings = () => {
  const { user, loading } = useAuth();

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
      <EnhancedBookingManager />
    </div>
  );
};

export default Bookings;