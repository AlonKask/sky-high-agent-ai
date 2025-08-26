import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RefreshCw, Download, History, Zap, BarChart3 } from "lucide-react";
import { useEmailSync } from "@/hooks/useEmailSync";
import { useGmailIntegration } from "@/hooks/useGmailIntegration";

interface EmailSyncControlsProps {
  isOpen: boolean;
  onClose: () => void;
  emailCount: number;
}

const EmailSyncControls: React.FC<EmailSyncControlsProps> = ({ 
  isOpen, 
  onClose, 
  emailCount 
}) => {
  const { authStatus } = useGmailIntegration();
  const {
    syncProgress,
    performQuickSync,
    performFullSync,
    performHistoricalSync,
    performProgressiveSync,
    isSyncActive
  } = useEmailSync();

  if (!isOpen) return null;

  const getSyncRecommendation = () => {
    if (emailCount === 0) {
      return {
        title: "Full Mailbox Sync Recommended",
        description: "Start with a comprehensive sync to import all your emails",
        action: performProgressiveSync,
        icon: Download,
        variant: "default" as const
      };
    } else if (emailCount < 50) {
      return {
        title: "Full Sync Recommended", 
        description: "You have few emails, a full sync will ensure nothing is missed",
        action: performFullSync,
        icon: RefreshCw,
        variant: "default" as const
      };
    } else {
      return {
        title: "Quick Sync Available",
        description: "Sync recent emails to stay up to date",
        action: performQuickSync,
        icon: Zap,
        variant: "secondary" as const
      };
    }
  };

  const recommendation = getSyncRecommendation();
  const RecommendedIcon = recommendation.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-lg mx-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Email Sync Controls
              </CardTitle>
              <CardDescription>
                Choose how to sync your Gmail emails ({emailCount} currently loaded)
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>×</Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Sync Progress */}
          {isSyncActive && (
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Sync in Progress</span>
                  <Badge variant="secondary">
                    {syncProgress.syncType}
                  </Badge>
                </div>
                <Progress value={75} className="mb-2" />
                <p className="text-xs text-muted-foreground">
                  {syncProgress.message}
                </p>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Processed: {syncProgress.emailsProcessed}</span>
                  <span>Stored: {syncProgress.emailsStored}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Gmail Connection Status */}
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-md">
            <span className="text-sm">Gmail Status</span>
            <Badge variant={authStatus.isConnected ? "default" : "destructive"}>
              {authStatus.isConnected ? "Connected" : "Disconnected"}
            </Badge>
          </div>

          {/* Recommended Action */}
          <Card className="border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <RecommendedIcon className="w-4 h-4 text-primary" />
                <span className="font-medium text-sm">Recommended</span>
              </div>
              <h4 className="font-medium mb-1">{recommendation.title}</h4>
              <p className="text-sm text-muted-foreground mb-3">
                {recommendation.description}
              </p>
              <Button 
                onClick={() => recommendation.action()}
                disabled={!authStatus.isConnected || isSyncActive}
                variant={recommendation.variant}
                size="sm"
                className="w-full"
              >
                <RecommendedIcon className="w-4 h-4 mr-2" />
                Start Sync
              </Button>
            </CardContent>
          </Card>

          {/* All Sync Options */}
          <div className="grid grid-cols-1 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => performQuickSync(true)}
              disabled={!authStatus.isConnected || isSyncActive}
              className="justify-start"
            >
              <Zap className="w-4 h-4 mr-2" />
              Quick Sync (Recent emails)
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => performFullSync(true)}
              disabled={!authStatus.isConnected || isSyncActive}
              className="justify-start"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Full Sync (Last 12 months)
            </Button>
            
            <Button
              variant="outline" 
              size="sm"
              onClick={() => performHistoricalSync(true)}
              disabled={!authStatus.isConnected || isSyncActive}
              className="justify-start"
            >
              <History className="w-4 h-4 mr-2" />
              Historical Sync (Older emails)
            </Button>

            <Button
              variant="outline"
              size="sm" 
              onClick={() => performProgressiveSync()}
              disabled={!authStatus.isConnected || isSyncActive}
              className="justify-start"
            >
              <Download className="w-4 h-4 mr-2" />
              Complete Mailbox Sync
            </Button>
          </div>

          {/* Helper Text */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Quick Sync: Last 7 days (~50-100 emails)</p>
            <p>• Full Sync: Last 12 months (~200 emails per batch)</p>
            <p>• Historical: Older emails in chunks</p>
            <p>• Complete: Progressive sync of entire mailbox</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailSyncControls;