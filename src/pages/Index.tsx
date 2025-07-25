
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import AIEmailAssistant from "@/components/AIEmailAssistant";
import { 
  Mail, 
  Users, 
  Calendar, 
  TrendingUp, 
  Bot,
  Shield
} from "lucide-react";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

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
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <Bot className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">AI Email Assistant</h1>
          <Badge variant="secondary" className="ml-2">
            <Shield className="w-3 h-3 mr-1" />
            Production Ready
          </Badge>
        </div>
        
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Intelligent email management powered by AI. Analyze, draft, and manage your emails 
          with advanced natural language processing and CRM integration.
        </p>
      </div>

      <Separator />

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* AI Assistant - Takes 2/3 of the width */}
        <div className="lg:col-span-2">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold">AI Assistant</h2>
                <p className="text-muted-foreground">
                  Chat with your AI assistant for intelligent email management
                </p>
              </div>
            </div>
            
            <div className="h-[700px] rounded-lg border bg-card">
              <AIEmailAssistant />
            </div>
          </div>
        </div>

        {/* Quick Actions Sidebar - Takes 1/3 of the width */}
        <div className="lg:col-span-1">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full h-16 flex items-center justify-start gap-4 text-left"
                  onClick={() => navigate("/emails")}
                >
                  <Mail className="w-6 h-6" />
                  <div>
                    <div className="font-semibold">Email Management</div>
                    <div className="text-sm text-muted-foreground">Manage your inbox</div>
                  </div>
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full h-16 flex items-center justify-start gap-4 text-left"
                  onClick={() => navigate("/clients")}
                >
                  <Users className="w-6 h-6" />
                  <div>
                    <div className="font-semibold">Client Management</div>
                    <div className="text-sm text-muted-foreground">Manage relationships</div>
                  </div>
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full h-16 flex items-center justify-start gap-4 text-left"
                  onClick={() => navigate("/calendar")}
                >
                  <Calendar className="w-6 h-6" />
                  <div>
                    <div className="font-semibold">Calendar</div>
                    <div className="text-sm text-muted-foreground">Schedule & events</div>
                  </div>
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full h-16 flex items-center justify-start gap-4 text-left"
                  onClick={() => navigate("/analytics")}
                >
                  <TrendingUp className="w-6 h-6" />
                  <div>
                    <div className="font-semibold">Analytics</div>
                    <div className="text-sm text-muted-foreground">Performance insights</div>
                  </div>
                </Button>
              </div>
            </div>
            
            {/* System Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">System Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">AI Assistant</span>
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                    Online
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Email Sync</span>
                  <Badge variant="secondary">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
                    Ready
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Database</span>
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                    Connected
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Index;
