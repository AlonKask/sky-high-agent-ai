import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Mail, Settings } from 'lucide-react';
import { GmailCredentialDiagnostic } from './GmailCredentialDiagnostic';
import { EnhancedGmailDiagnostic } from './EnhancedGmailDiagnostic';
import { GmailConnectionDiagnostic } from './GmailConnectionDiagnostic';
import { GmailNetworkDiagnostic } from './GmailNetworkDiagnostic';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const GmailStatusButton: React.FC = () => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Mail className="w-4 h-4" />
          Gmail Status
          <Badge variant="secondary" className="ml-1">
            <Settings className="w-3 h-3" />
          </Badge>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gmail Integration Status</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <Tabs defaultValue="enhanced" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="enhanced">Enhanced</TabsTrigger>
              <TabsTrigger value="credentials">Credentials</TabsTrigger>
              <TabsTrigger value="connection">Connection</TabsTrigger>
              <TabsTrigger value="network">Network</TabsTrigger>
            </TabsList>
            
            <TabsContent value="enhanced" className="mt-4">
              <EnhancedGmailDiagnostic />
            </TabsContent>
            
            <TabsContent value="credentials" className="mt-4">
              <GmailCredentialDiagnostic />
            </TabsContent>
            
            <TabsContent value="connection" className="mt-4">
              <GmailConnectionDiagnostic />
            </TabsContent>
            
            <TabsContent value="network" className="mt-4">
              <GmailNetworkDiagnostic />
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};