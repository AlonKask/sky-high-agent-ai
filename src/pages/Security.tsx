import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, AlertTriangle, Eye, FileText, Lock, Users, Activity, Zap } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { ZeroTrustDashboard } from "@/components/ZeroTrustDashboard";
import { EnhancedAuthSecurity } from "@/components/EnhancedAuthSecurity";
import { ThreatIntelligenceCenter } from "@/components/ThreatIntelligenceCenter";
import { ComplianceGovernance } from "@/components/ComplianceGovernance";
import { useAuth } from "@/hooks/useAuth";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Security() {
  const { user } = useAuth();
  const { role, loading } = useUserRole();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Security access control - only supervisors, managers, and admins
  if (!role || !['supervisor', 'manager', 'admin'].includes(role)) {
    return (
      <div className="container mx-auto p-6">
        <Alert className="border-destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Access denied. Security features require supervisor, manager, or admin privileges.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            Zero Trust Security Center
          </h1>
          <p className="text-muted-foreground mt-2">
            Enterprise-grade security monitoring and threat intelligence
          </p>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="auth" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Authentication
          </TabsTrigger>
          <TabsTrigger value="threats" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Threat Intel
          </TabsTrigger>
          <TabsTrigger value="compliance" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Compliance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <ZeroTrustDashboard />
        </TabsContent>

        <TabsContent value="auth" className="space-y-6">
          <EnhancedAuthSecurity />
        </TabsContent>

        <TabsContent value="threats" className="space-y-6">
          <ThreatIntelligenceCenter />
        </TabsContent>

        <TabsContent value="compliance" className="space-y-6">
          <ComplianceGovernance />
        </TabsContent>
      </Tabs>
    </div>
  );
}