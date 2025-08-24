
import { useSearchParams } from "react-router-dom";
import { useEffect } from "react";
import EnhancedClientManager from "@/components/EnhancedClientManager";

const Clients = () => {
  const [searchParams] = useSearchParams();

  // Handle URL parameters for filtering
  useEffect(() => {
    const status = searchParams.get('status');
    
    if (status === 'follow-up') {
      console.log('Filtering clients needing follow-up');
      // This would be passed to the EnhancedClientManager component for filtering
    }
  }, [searchParams]);

  return (
    <div className="container mx-auto p-6">
      <EnhancedClientManager />
    </div>
  );
};

export default Clients;
