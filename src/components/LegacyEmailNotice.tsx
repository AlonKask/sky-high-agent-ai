import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Info, RefreshCw, Mail } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface LegacyEmailNoticeProps {
  legacyCount: number;
  isGmailConnected: boolean;
  onConnectGmail: () => void;
  onSyncEmails: () => void;
  isSyncing?: boolean;
}

export const LegacyEmailNotice: React.FC<LegacyEmailNoticeProps> = ({
  legacyCount,
  isGmailConnected,
  onConnectGmail,
  onSyncEmails,
  isSyncing = false
}) => {
  if (legacyCount === 0) return null;

  return (
    <Card className="mb-4 border-blue-200 bg-blue-50">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-medium text-blue-900">Legacy Email Data</h3>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                {legacyCount} emails
              </Badge>
            </div>
            
            <p className="text-sm text-blue-800 mb-3">
              You're viewing {legacyCount} emails from an earlier system version. 
              {!isGmailConnected ? (
                <span> Connect Gmail to sync fresh emails and enable full functionality.</span>
              ) : (
                <span> Gmail is connected - sync to get the latest emails.</span>
              )}
            </p>
            
            <div className="flex gap-2">
              {!isGmailConnected ? (
                <Button 
                  onClick={onConnectGmail}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Mail className="h-4 w-4 mr-1" />
                  Connect Gmail
                </Button>
              ) : (
                <Button 
                  onClick={onSyncEmails}
                  size="sm"
                  disabled={isSyncing}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSyncing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Sync Fresh Emails
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};