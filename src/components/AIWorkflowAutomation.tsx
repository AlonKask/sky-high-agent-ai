import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Zap, 
  Bot, 
  Calendar, 
  Mail, 
  User, 
  Target,
  Clock,
  CheckCircle,
  AlertTriangle,
  Plus,
  Settings,
  Play,
  Pause,
  Activity,
  TrendingUp
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface AutomationWorkflow {
  id: string;
  name: string;
  description: string;
  trigger: {
    type: 'client_created' | 'booking_completed' | 'email_received' | 'time_based' | 'score_change';
    conditions: Record<string, any>;
  };
  actions: {
    type: 'send_email' | 'create_task' | 'update_score' | 'notify_user' | 'schedule_follow_up';
    config: Record<string, any>;
  }[];
  isActive: boolean;
  lastRun?: Date;
  executionCount: number;
  successRate: number;
  estimatedSavings: number; // hours per month
}

const AIWorkflowAutomation = () => {
  const { user } = useAuth();
  const [workflows, setWorkflows] = useState<AutomationWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkflow, setSelectedWorkflow] = useState<AutomationWorkflow | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (user) {
      loadWorkflows();
    }
  }, [user]);

  const loadWorkflows = async () => {
    try {
      setLoading(true);
      
      // Load sample automation workflows
      const sampleWorkflows: AutomationWorkflow[] = [
        {
          id: '1',
          name: 'New Client Welcome Sequence',
          description: 'Automatically send welcome emails and setup follow-ups for new clients',
          trigger: {
            type: 'client_created',
            conditions: {}
          },
          actions: [
            {
              type: 'send_email',
              config: {
                template: 'welcome_new_client',
                delay: 0
              }
            },
            {
              type: 'schedule_follow_up',
              config: {
                delay: 24,
                message: 'Check client onboarding progress'
              }
            }
          ],
          isActive: true,
          lastRun: new Date('2024-01-15T10:30:00'),
          executionCount: 47,
          successRate: 98.7,
          estimatedSavings: 8.5
        },
        {
          id: '2',
          name: 'High-Value Lead Alert',
          description: 'Notify when a lead score exceeds threshold for immediate attention',
          trigger: {
            type: 'score_change',
            conditions: {
              scoreThreshold: 80,
              direction: 'increase'
            }
          },
          actions: [
            {
              type: 'notify_user',
              config: {
                priority: 'high',
                message: 'High-value lead detected - immediate follow-up recommended'
              }
            },
            {
              type: 'create_task',
              config: {
                title: 'Follow up with high-value lead',
                priority: 'urgent'
              }
            }
          ],
          isActive: true,
          lastRun: new Date('2024-01-14T15:20:00'),
          executionCount: 23,
          successRate: 100,
          estimatedSavings: 5.2
        },
        {
          id: '3',
          name: 'Booking Confirmation & Upsell',
          description: 'Send confirmation and suggest premium upgrades after booking',
          trigger: {
            type: 'booking_completed',
            conditions: {}
          },
          actions: [
            {
              type: 'send_email',
              config: {
                template: 'booking_confirmation',
                delay: 0
              }
            },
            {
              type: 'send_email',
              config: {
                template: 'premium_upgrade_offer',
                delay: 2
              }
            }
          ],
          isActive: false,
          lastRun: new Date('2024-01-12T09:15:00'),
          executionCount: 156,
          successRate: 94.2,
          estimatedSavings: 12.3
        },
        {
          id: '4',
          name: 'Churn Risk Prevention',
          description: 'Detect and automatically reach out to clients at risk of churning',
          trigger: {
            type: 'time_based',
            conditions: {
              schedule: 'weekly',
              dayOfWeek: 1
            }
          },
          actions: [
            {
              type: 'send_email',
              config: {
                template: 'check_in_inactive_clients',
                conditions: {
                  lastInteraction: 30
                }
              }
            },
            {
              type: 'notify_user',
              config: {
                message: 'Weekly churn risk assessment completed'
              }
            }
          ],
          isActive: true,
          lastRun: new Date('2024-01-15T00:00:00'),
          executionCount: 8,
          successRate: 87.5,
          estimatedSavings: 15.7
        }
      ];

      setWorkflows(sampleWorkflows);
    } catch (error) {
      console.error('Error loading workflows:', error);
      toast.error('Failed to load automation workflows');
    } finally {
      setLoading(false);
    }
  };

  const toggleWorkflow = async (workflowId: string, isActive: boolean) => {
    try {
      setWorkflows(prev => 
        prev.map(w => 
          w.id === workflowId 
            ? { ...w, isActive } 
            : w
        )
      );
      
      toast.success(`Workflow ${isActive ? 'activated' : 'deactivated'}`);
    } catch (error) {
      toast.error('Failed to update workflow');
    }
  };

  const getTriggerIcon = (type: string) => {
    switch (type) {
      case 'client_created': return <User className="h-4 w-4 text-blue-600" />;
      case 'booking_completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'email_received': return <Mail className="h-4 w-4 text-purple-600" />;
      case 'time_based': return <Clock className="h-4 w-4 text-orange-600" />;
      case 'score_change': return <Target className="h-4 w-4 text-red-600" />;
      default: return <Zap className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'send_email': return <Mail className="h-3 w-3" />;
      case 'create_task': return <CheckCircle className="h-3 w-3" />;
      case 'notify_user': return <AlertTriangle className="h-3 w-3" />;
      case 'schedule_follow_up': return <Calendar className="h-3 w-3" />;
      default: return <Activity className="h-3 w-3" />;
    }
  };

  const formatTriggerType = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatActionType = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">AI Workflow Automation</h2>
        </div>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            AI Workflow Automation
          </h2>
          <p className="text-muted-foreground">Intelligent automation to streamline your business processes</p>
        </div>
        <Button className="bg-primary">
          <Plus className="h-4 w-4 mr-2" />
          Create Workflow
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="card-elevated">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Workflows</p>
                <p className="text-2xl font-bold text-green-600">
                  {workflows.filter(w => w.isActive).length}
                </p>
              </div>
              <Activity className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Executions</p>
                <p className="text-2xl font-bold text-blue-600">
                  {workflows.reduce((sum, w) => sum + w.executionCount, 0)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold text-purple-600">
                  {(workflows.reduce((sum, w) => sum + w.successRate, 0) / workflows.length).toFixed(1)}%
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Time Saved</p>
                <p className="text-2xl font-bold text-orange-600">
                  {workflows.reduce((sum, w) => sum + w.estimatedSavings, 0).toFixed(1)}h
                </p>
                <p className="text-xs text-muted-foreground">per month</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workflows List */}
      <div className="space-y-4">
        {workflows.map((workflow) => (
          <Card key={workflow.id} className="card-elevated hover-scale">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                    {getTriggerIcon(workflow.trigger.type)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">{workflow.name}</h3>
                    <p className="text-muted-foreground mb-3">{workflow.description}</p>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                      <div className="flex items-center gap-1">
                        {getTriggerIcon(workflow.trigger.type)}
                        <span>Trigger: {formatTriggerType(workflow.trigger.type)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Activity className="h-4 w-4" />
                        <span>{workflow.actions.length} actions</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>Saves {workflow.estimatedSavings}h/month</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={workflow.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                        {workflow.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      <Badge variant="outline">
                        {workflow.executionCount} executions
                      </Badge>
                      <Badge variant="outline">
                        {workflow.successRate}% success rate
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Switch
                    checked={workflow.isActive}
                    onCheckedChange={(checked) => toggleWorkflow(workflow.id, checked)}
                  />
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>{workflow.name}</DialogTitle>
                        <DialogDescription>
                          Workflow configuration and performance details
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Trigger Configuration</Label>
                          <div className="mt-2 p-3 bg-muted rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              {getTriggerIcon(workflow.trigger.type)}
                              <span className="font-medium">{formatTriggerType(workflow.trigger.type)}</span>
                            </div>
                            <pre className="text-xs text-muted-foreground">
                              {JSON.stringify(workflow.trigger.conditions, null, 2)}
                            </pre>
                          </div>
                        </div>
                        
                        <div>
                          <Label>Actions ({workflow.actions.length})</Label>
                          <div className="mt-2 space-y-2">
                            {workflow.actions.map((action, index) => (
                              <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                                {getActionIcon(action.type)}
                                <span className="text-sm">{formatActionType(action.type)}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Last Run</Label>
                            <div className="text-sm text-muted-foreground">
                              {workflow.lastRun?.toLocaleString() || 'Never'}
                            </div>
                          </div>
                          <div>
                            <Label>Execution Count</Label>
                            <div className="text-sm text-muted-foreground">
                              {workflow.executionCount} times
                            </div>
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {/* Action Flow Visualization */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                <div className="flex items-center gap-1 bg-primary/10 px-2 py-1 rounded text-xs whitespace-nowrap">
                  {getTriggerIcon(workflow.trigger.type)}
                  <span>Trigger</span>
                </div>
                <div className="h-px w-4 bg-border"></div>
                {workflow.actions.map((action, index) => (
                  <div key={index} className="flex items-center gap-1">
                    <div className="flex items-center gap-1 bg-muted px-2 py-1 rounded text-xs whitespace-nowrap">
                      {getActionIcon(action.type)}
                      <span>{formatActionType(action.type)}</span>
                    </div>
                    {index < workflow.actions.length - 1 && (
                      <div className="h-px w-4 bg-border"></div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {workflows.length === 0 && (
        <Card className="card-elevated">
          <CardContent className="p-12 text-center">
            <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Automation Workflows</h3>
            <p className="text-muted-foreground mb-4">
              Create your first automation workflow to streamline your business processes.
            </p>
            <Button className="bg-primary">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Workflow
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AIWorkflowAutomation;