import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { FileText, Download, Calendar as CalendarIcon, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface ComplianceReport {
  id: string;
  report_type: string;
  period_start: string;
  period_end: string;
  report_data: any;
  generated_by: string;
  created_at: string;
}

export const ComplianceReportsDashboard = () => {
  const [reports, setReports] = useState<ComplianceReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [reportType, setReportType] = useState('gdpr');
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const { toast } = useToast();

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from('compliance_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error fetching compliance reports:', error);
      toast({
        title: "Error",
        description: "Failed to fetch compliance reports",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    if (!startDate || !endDate) {
      toast({
        title: "Error",
        description: "Please select both start and end dates",
        variant: "destructive"
      });
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.rpc('generate_compliance_report', {
        p_report_type: reportType,
        p_start_date: format(startDate, 'yyyy-MM-dd'),
        p_end_date: format(endDate, 'yyyy-MM-dd')
      });

      if (error) throw error;

      // Save the report
      const { data: { user } } = await supabase.auth.getUser();
      const { error: saveError } = await supabase
        .from('compliance_reports')
        .insert({
          report_type: reportType,
          period_start: format(startDate, 'yyyy-MM-dd'),
          period_end: format(endDate, 'yyyy-MM-dd'),
          report_data: data,
          generated_by: user?.id || ''
        });

      if (saveError) throw saveError;

      await fetchReports();
      toast({
        title: "Report Generated",
        description: `${reportType.toUpperCase()} compliance report has been generated successfully`
      });
    } catch (error: any) {
      console.error('Error generating report:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate compliance report",
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  const downloadReport = (report: ComplianceReport) => {
    const dataStr = JSON.stringify(report.report_data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${report.report_type}_compliance_report_${report.period_start}_to_${report.period_end}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getComplianceScore = (reportData: any) => {
    if (!reportData?.metrics) return 'N/A';
    const score = reportData.metrics.consent_compliance_rate || 0;
    return `${Math.round(score)}%`;
  };

  const getScoreColor = (score: string) => {
    if (score === 'N/A') return 'outline';
    const numScore = parseInt(score);
    if (numScore >= 95) return 'default';
    if (numScore >= 85) return 'secondary';
    return 'destructive';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Compliance Report
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Report Type</label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gdpr">GDPR Compliance</SelectItem>
                  <SelectItem value="ccpa">CCPA Compliance</SelectItem>
                  <SelectItem value="pipeda">PIPEDA Compliance</SelectItem>
                  <SelectItem value="general">General Security</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Start Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'MMM dd, yyyy') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">End Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, 'MMM dd, yyyy') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-end">
              <Button 
                onClick={generateReport} 
                disabled={generating || !startDate || !endDate}
                className="w-full"
              >
                {generating ? 'Generating...' : 'Generate Report'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Compliance Reports History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center text-muted-foreground py-8">Loading reports...</div>
          ) : reports.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No compliance reports generated yet
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <Card key={report.id} className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{report.report_type.toUpperCase()} Report</h4>
                          <Badge variant={getScoreColor(getComplianceScore(report.report_data))}>
                            Compliance: {getComplianceScore(report.report_data)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Period: {format(new Date(report.period_start), 'MMM dd, yyyy')} - {format(new Date(report.period_end), 'MMM dd, yyyy')}
                        </p>
                        <div className="text-xs text-muted-foreground">
                          Generated: {new Date(report.created_at).toLocaleString()}
                        </div>
                        {report.report_data?.metrics && (
                          <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="font-medium">Data Access Events:</span>
                              <div>{report.report_data.metrics.total_data_access_events}</div>
                            </div>
                            <div>
                              <span className="font-medium">Security Events:</span>
                              <div>{report.report_data.metrics.total_security_events}</div>
                            </div>
                            <div>
                              <span className="font-medium">Active Users:</span>
                              <div>{report.report_data.metrics.active_users}</div>
                            </div>
                            <div>
                              <span className="font-medium">Consent Rate:</span>
                              <div>{Math.round(report.report_data.metrics.consent_compliance_rate)}%</div>
                            </div>
                          </div>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadReport(report)}
                        className="ml-4"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};