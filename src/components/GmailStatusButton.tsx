import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Mail, Settings } from 'lucide-react';
import { GmailCredentialDiagnostic } from './GmailCredentialDiagnostic';

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
          <GmailCredentialDiagnostic />
        </div>
      </DialogContent>
    </Dialog>
  );
};