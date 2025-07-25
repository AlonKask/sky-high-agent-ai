
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
  Shield,
  Zap,
  MessageSquare
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

      {/* Features Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Smart Analysis</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              AI-powered email analysis with sentiment detection and key information extraction
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft Generation</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Generate professional email responses with context-aware suggestions
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CRM Integration</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Seamlessly integrated with your client management and booking systems
            </p>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Main AI Assistant Interface */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">AI Assistant</h2>
            <p className="text-muted-foreground">
              Chat with your AI assistant for intelligent email management
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/emails")}
            >
              <Mail className="w-4 h-4 mr-2" />
              View Emails
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/clients")}
            >
              <Users className="w-4 h-4 mr-2" />
              Manage Clients
            </Button>
          </div>
        </div>

        <AIEmailAssistant />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
        <Button
          variant="outline"
          className="h-20 flex-col gap-2"
          onClick={() => navigate("/emails")}
        >
          <Mail className="w-6 h-6" />
          <span className="text-sm">Email Management</span>
        </Button>
        
        <Button
          variant="outline"
          className="h-20 flex-col gap-2"
          onClick={() => navigate("/clients")}
        >
          <Users className="w-6 h-6" />
          <span className="text-sm">Client Management</span>
        </Button>
        
        <Button
          variant="outline"
          className="h-20 flex-col gap-2"
          onClick={() => navigate("/calendar")}
        >
          <Calendar className="w-6 h-6" />
          <span className="text-sm">Calendar</span>
        </Button>
        
        <Button
          variant="outline"
          className="h-20 flex-col gap-2"
          onClick={() => navigate("/analytics")}
        >
          <TrendingUp className="w-6 h-6" />
          <span className="text-sm">Analytics</span>
        </Button>
      </div>
    </div>
  );
};

export default Index;
