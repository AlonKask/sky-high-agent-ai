import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  Download, 
  Calendar,
  Users,
  Database,
  Lock,
  Globe,
  BarChart3,
  Settings
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useEnhancedSecurityMonitoring } from '@/hooks/useEnhancedSecurityMonitoring';

interface ComplianceFramework {
  id: string;
  name: string;
  description: string;
  status: 'compliant' | 'partial' | 'non_compliant' | 'pending';
  score: number;
  lastAssessment: string;
  nextReview: string;
  requirements: number;
  completedRequirements: number;
  criticalIssues: number;
}

interface DataClassification {
  id: string;
  category: 'public' | 'internal' | 'confidential' | 'restricted' | 'secret';
  count: number;
  percentage: number;
  retention: string;
  encryption: boolean;
  accessControl: boolean;
}

interface ComplianceReport {
  id: string;
  type: 'gdpr' | 'sox' | 'iso27001' | 'hipaa' | 'pci_dss';
  title: string;
  generatedAt: string;
  period: string;
  status: 'generated' | 'reviewed' | 'approved' | 'submitted';
  findings: number;
  recommendations: number;
}

interface DataGovernanceMetrics {
  totalDataAssets: number;
  classifiedAssets: number;
  encryptedAssets: number;
  dataRetentionCompliance: number;
  accessControlCoverage: number;
  privacyScore: number;
}

export const ComplianceGovernance: React.FC = () => {
  const { user } = useAuth();
  const { logSecurityEvent } = useEnhancedSecurityMonitoring();
  const [frameworks, setFrameworks] = useState<ComplianceFramework[]>([]);
  const [dataClassification, setDataClassification] = useState<DataClassification[]>([]);
  const [reports, setReports] = useState<ComplianceReport[]>([]);
  const [metrics, setMetrics] = useState<DataGovernanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      initializeComplianceData();
    }
  }, [user]);

  const initializeComplianceData = async () => {
    // Mock compliance data - in production, this would come from compliance management systems
    const mockFrameworks: ComplianceFramework[] = [
      {
        id: '1',
        name: 'GDPR',
        description: 'General Data Protection Regulation',
        status: 'compliant',
        score: 94,
        lastAssessment: new Date(Date.now() - 86400000 * 30).toISOString(),
        nextReview: new Date(Date.now() + 86400000 * 60).toISOString(),
        requirements: 25,
        completedRequirements: 24,
        criticalIssues: 0
      },
      {
        id: '2',
        name: 'SOX',
        description: 'Sarbanes-Oxley Act',
        status: 'partial',
        score: 78,
        lastAssessment: new Date(Date.now() - 86400000 * 15).toISOString(),
        nextReview: new Date(Date.now() + 86400000 * 45).toISOString(),
        requirements: 18,
        completedRequirements: 14,
        criticalIssues: 2
      },
      {
        id: '3',
        name: 'ISO 27001',
        description: 'Information Security Management',
        status: 'compliant',
        score: 89,
        lastAssessment: new Date(Date.now() - 86400000 * 20).toISOString(),
        nextReview: new Date(Date.now() + 86400000 * 70).toISOString(),
        requirements: 114,
        completedRequirements: 102,
        criticalIssues: 1
      }
    ];

    const mockClassification: DataClassification[] = [
      { id: '1', category: 'public', count: 1247, percentage: 15, retention: '1 year', encryption: false, accessControl: true },
      { id: '2', category: 'internal', count: 3891, percentage: 47, retention: '3 years', encryption: true, accessControl: true },
      { id: '3', category: 'confidential', count: 2156, percentage: 26, retention: '7 years', encryption: true, accessControl: true },
      { id: '4', category: 'restricted', count: 834, percentage: 10, retention: '10 years', encryption: true, accessControl: true },
      { id: '5', category: 'secret', count: 167, percentage: 2, retention: 'Permanent', encryption: true, accessControl: true }
    ];

    const mockReports: ComplianceReport[] = [
      {
        id: '1',
        type: 'gdpr',
        title: 'GDPR Compliance Assessment Q4 2024',
        generatedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
        period: 'Q4 2024',
        status: 'approved',
        findings: 3,
        recommendations: 8
      },
      {
        id: '2',
        type: 'sox',
        title: 'SOX Controls Testing Report',
        generatedAt: new Date(Date.now() - 86400000 * 14).toISOString(),
        period: 'November 2024',
        status: 'reviewed',
        findings: 5,
        recommendations: 12
      },
      {
        id: '3',
        type: 'iso27001',
        title: 'ISO 27001 Internal Audit',
        generatedAt: new Date(Date.now() - 86400000 * 21).toISOString(),
        period: 'October 2024',
        status: 'submitted',
        findings: 7,
        recommendations: 15
      }
    ];

    const mockMetrics: DataGovernanceMetrics = {
      totalDataAssets: 8295,
      classifiedAssets: 8127,
      encryptedAssets: 7421,
      dataRetentionCompliance: 96,
      accessControlCoverage: 99,
      privacyScore: 92
    };

    setFrameworks(mockFrameworks);
    setDataClassification(mockClassification);
    setReports(mockReports);
    setMetrics(mockMetrics);
    setLoading(false);
  };

  const generateComplianceReport = async (type: string) => {
    await logSecurityEvent('compliance_report_generated', 'medium', {
      reportType: type,
      timestamp: new Date().toISOString()
    });

    const newReport: ComplianceReport = {
      id: Date.now().toString(),
      type: type as any,
      title: `${type.toUpperCase()} Compliance Report`,
      generatedAt: new Date().toISOString(),
      period: new Date().toLocaleDateString(),
      status: 'generated',
      findings: Math.floor(Math.random() * 10),
      recommendations: Math.floor(Math.random() * 20)
    };

    setReports(prev => [newReport, ...prev]);
  };

  const downloadReport = async (reportId: string) => {
    await logSecurityEvent('compliance_report_downloaded', 'low', {
      reportId,
      timestamp: new Date().toISOString()
    });

    // Simulate report download
    console.log(`Downloading report ${reportId}`);
  };

  const getFrameworkStatusColor = (status: string) => {
    switch (status) {
      case 'compliant': return 'bg-green-100 text-green-800 border-green-200';
      case 'partial': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'non_compliant': return 'bg-red-100 text-red-800 border-red-200';
      case 'pending': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getReportStatusColor = (status: string) => {
    switch (status) {
      case 'generated': return 'bg-blue-100 text-blue-800';
      case 'reviewed': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'submitted': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getClassificationColor = (category: string) => {
    switch (category) {
      case 'public': return 'bg-gray-100 text-gray-800';
      case 'internal': return 'bg-blue-100 text-blue-800';
      case 'confidential': return 'bg-yellow-100 text-yellow-800';
      case 'restricted': return 'bg-orange-100 text-orange-800';
      case 'secret': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading || !metrics) {
    return <div>Loading compliance dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Data Governance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Data Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalDataAssets.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total managed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Classified</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {Math.round((metrics.classifiedAssets / metrics.totalDataAssets) * 100)}%
            </div>
            <p className="text-xs text-muted-foreground">Data classified</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Encrypted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {Math.round((metrics.encryptedAssets / metrics.totalDataAssets) * 100)}%
            </div>
            <p className="text-xs text-muted-foreground">Data encrypted</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Retention</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.dataRetentionCompliance}%</div>
            <p className="text-xs text-muted-foreground">Compliance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Access Control</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.accessControlCoverage}%</div>
            <p className="text-xs text-muted-foreground">Coverage</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Privacy Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.privacyScore}%</div>
            <p className="text-xs text-muted-foreground">Overall score</p>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Alerts */}
      {frameworks.some(f => f.criticalIssues > 0) && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Critical compliance issues detected!</strong> {frameworks.reduce((sum, f) => sum + f.criticalIssues, 0)} issues require immediate attention.
          </AlertDescription>
        </Alert>
      )}

      {/* Compliance Management */}
      <Tabs defaultValue="frameworks" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="frameworks">Compliance Frameworks</TabsTrigger>
          <TabsTrigger value="classification">Data Classification</TabsTrigger>
          <TabsTrigger value="reports">Compliance Reports</TabsTrigger>
          <TabsTrigger value="governance">Data Governance</TabsTrigger>
        </TabsList>

        <TabsContent value="frameworks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Compliance Frameworks
              </CardTitle>
              <CardDescription>
                Monitor compliance status across regulatory frameworks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {frameworks.map((framework) => (
                  <div key={framework.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">{framework.name}</h4>
                        <p className="text-sm text-muted-foreground">{framework.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getFrameworkStatusColor(framework.status)}>
                          {framework.status.replace('_', ' ')}
                        </Badge>
                        <Badge variant="outline">
                          {framework.score}% complete
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Requirements Progress</span>
                        <span>{framework.completedRequirements} / {framework.requirements}</span>
                      </div>
                      <Progress 
                        value={(framework.completedRequirements / framework.requirements) * 100} 
                        className="h-2" 
                      />
                    </div>

                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Last assessment: {new Date(framework.lastAssessment).toLocaleDateString()}</span>
                      <span>Next review: {new Date(framework.nextReview).toLocaleDateString()}</span>
                    </div>

                    {framework.criticalIssues > 0 && (
                      <Alert className="border-red-200 bg-red-50">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-800">
                          {framework.criticalIssues} critical issues require immediate attention
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="classification" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Data Classification
              </CardTitle>
              <CardDescription>
                Automated data classification and protection status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dataClassification.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <Badge className={getClassificationColor(item.category)}>
                        {item.category.toUpperCase()}
                      </Badge>
                      <div>
                        <div className="font-medium">{item.count.toLocaleString()} assets</div>
                        <div className="text-sm text-muted-foreground">
                          {item.percentage}% of total • Retention: {item.retention}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        {item.encryption ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                        )}
                        <span>Encrypted</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {item.accessControl ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                        )}
                        <span>Access Control</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Compliance Reports
                </CardTitle>
                <CardDescription>
                  Generate and manage compliance assessment reports
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => generateComplianceReport('gdpr')} variant="outline" size="sm">
                  Generate GDPR Report
                </Button>
                <Button onClick={() => generateComplianceReport('sox')} variant="outline" size="sm">
                  Generate SOX Report
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reports.map((report) => (
                  <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{report.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        Period: {report.period} • Generated: {new Date(report.generatedAt).toLocaleDateString()}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span>{report.findings} findings</span>
                        <span>{report.recommendations} recommendations</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getReportStatusColor(report.status)}>
                        {report.status}
                      </Badge>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => downloadReport(report.id)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="governance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Data Governance Dashboard
              </CardTitle>
              <CardDescription>
                Executive view of data governance and compliance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Data Protection Metrics</h4>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Data Classification Coverage</span>
                          <span>{Math.round((metrics.classifiedAssets / metrics.totalDataAssets) * 100)}%</span>
                        </div>
                        <Progress value={(metrics.classifiedAssets / metrics.totalDataAssets) * 100} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Encryption Coverage</span>
                          <span>{Math.round((metrics.encryptedAssets / metrics.totalDataAssets) * 100)}%</span>
                        </div>
                        <Progress value={(metrics.encryptedAssets / metrics.totalDataAssets) * 100} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Access Control Coverage</span>
                          <span>{metrics.accessControlCoverage}%</span>
                        </div>
                        <Progress value={metrics.accessControlCoverage} className="h-2" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Compliance Status</h4>
                    <div className="space-y-3">
                      {frameworks.map((framework) => (
                        <div key={framework.id}>
                          <div className="flex justify-between text-sm mb-1">
                            <span>{framework.name}</span>
                            <span>{framework.score}%</span>
                          </div>
                          <Progress value={framework.score} className="h-2" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h4 className="font-medium mb-4">Privacy and Governance Actions</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Button variant="outline" className="h-20 flex-col">
                      <Users className="h-6 w-6 mb-2" />
                      Data Subject Requests
                    </Button>
                    <Button variant="outline" className="h-20 flex-col">
                      <Lock className="h-6 w-6 mb-2" />
                      Privacy Impact Assessment
                    </Button>
                    <Button variant="outline" className="h-20 flex-col">
                      <Globe className="h-6 w-6 mb-2" />
                      Data Transfer Assessment
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};