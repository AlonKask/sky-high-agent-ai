import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSimpleAuth } from '@/hooks/useSimpleAuth';

interface EmailAnalytics {
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  totalReplied: number;
  openRate: number;
  clickRate: number;
  replyRate: number;
  topTemplates: Array<{
    id: string;
    name: string;
    openRate: number;
    sends: number;
  }>;
  recentPerformance: Array<{
    date: string;
    sent: number;
    opened: number;
    replied: number;
  }>;
}

export const useEmailAnalytics = (timeRange: number = 30) => {
  const { user } = useSimpleAuth();
  const [analytics, setAnalytics] = useState<EmailAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - timeRange);

      // Fetch email performance data
      const { data: performanceData, error: perfError } = await supabase
        .from('email_performance_analytics')
        .select('*')
        .gte('sent_at', startDate.toISOString())
        .lte('sent_at', endDate.toISOString());

      if (perfError) throw perfError;

      // Calculate overview metrics
      const totalSent = performanceData?.length || 0;
      const totalOpened = performanceData?.filter(p => p.opened_at).length || 0;
      const totalClicked = performanceData?.filter(p => p.clicked_at).length || 0;
      const totalReplied = performanceData?.filter(p => p.replied_at).length || 0;

      const openRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0;
      const clickRate = totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0;
      const replyRate = totalSent > 0 ? (totalReplied / totalSent) * 100 : 0;

      // Get template performance
      const { data: templateData, error: tempError } = await supabase
        .from('email_templates')
        .select(`
          id, name,
          email_performance_analytics!inner(*)
        `)
        .gte('email_performance_analytics.sent_at', startDate.toISOString());

      const topTemplates = processTemplateData(templateData || []);

      // Generate recent performance (last 7 days)
      const recentPerformance = generateRecentPerformance(performanceData || [], 7);

      setAnalytics({
        totalSent,
        totalOpened,
        totalClicked,
        totalReplied,
        openRate,
        clickRate,
        replyRate,
        topTemplates,
        recentPerformance
      });

    } catch (err: any) {
      console.error('Error loading analytics:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const processTemplateData = (templateData: any[]): EmailAnalytics['topTemplates'] => {
    const templateMap = new Map();

    templateData.forEach(template => {
      const templateId = template.id;
      if (!templateMap.has(templateId)) {
        templateMap.set(templateId, {
          id: templateId,
          name: template.name,
          sends: 0,
          opens: 0
        });
      }

      const stats = templateMap.get(templateId);
      stats.sends += 1;
      if (template.email_performance_analytics?.opened_at) {
        stats.opens += 1;
      }
    });

    return Array.from(templateMap.values())
      .map(template => ({
        ...template,
        openRate: template.sends > 0 ? (template.opens / template.sends) * 100 : 0
      }))
      .sort((a, b) => b.openRate - a.openRate)
      .slice(0, 5);
  };

  const generateRecentPerformance = (performanceData: any[], days: number) => {
    const performance = [];
    const endDate = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(endDate);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayPerf = performanceData.filter(p => 
        p.sent_at.startsWith(dateStr)
      );
      
      performance.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        sent: dayPerf.length,
        opened: dayPerf.filter(p => p.opened_at).length,
        replied: dayPerf.filter(p => p.replied_at).length,
      });
    }
    
    return performance;
  };

  const trackEmailSent = async (emailData: {
    subjectLine: string;
    recipientEmail: string;
    emailType: string;
    templateId?: string;
    aiScore?: number;
  }) => {
    try {
      const { error } = await supabase
        .from('email_performance_analytics')
        .insert({
          user_id: user?.id, // Add user_id from context
          subject_line: emailData.subjectLine,
          recipient_email: emailData.recipientEmail,
          email_type: emailData.emailType,
          template_id: emailData.templateId,
          ai_score: emailData.aiScore || 50,
          sent_at: new Date().toISOString()
        });

      if (error) throw error;
      
      // Reload analytics after tracking
      loadAnalytics();
    } catch (err) {
      console.error('Error tracking email:', err);
    }
  };

  const trackEmailOpened = async (emailId: string) => {
    try {
      const { error } = await supabase
        .from('email_performance_analytics')
        .update({ 
          opened_at: new Date().toISOString(),
          engagement_score: 25 // Opened but not clicked
        })
        .eq('email_id', emailId);

      if (error) throw error;
      loadAnalytics();
    } catch (err) {
      console.error('Error tracking email open:', err);
    }
  };

  const trackEmailClicked = async (emailId: string) => {
    try {
      const { error } = await supabase
        .from('email_performance_analytics')
        .update({ 
          clicked_at: new Date().toISOString(),
          engagement_score: 50 // Clicked shows higher engagement
        })
        .eq('email_id', emailId);

      if (error) throw error;
      loadAnalytics();
    } catch (err) {
      console.error('Error tracking email click:', err);
    }
  };

  const trackEmailReply = async (emailId: string, conversionValue?: number) => {
    try {
      const { error } = await supabase
        .from('email_performance_analytics')
        .update({ 
          replied_at: new Date().toISOString(),
          engagement_score: 100, // Reply shows maximum engagement
          conversion_value: conversionValue || 0
        })
        .eq('email_id', emailId);

      if (error) throw error;
      loadAnalytics();
    } catch (err) {
      console.error('Error tracking email reply:', err);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  return {
    analytics,
    loading,
    error,
    refetch: loadAnalytics,
    trackEmailSent,
    trackEmailOpened,
    trackEmailClicked,
    trackEmailReply
  };
};