import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Database, Download, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';

interface MigrationStatus {
  isRunning: boolean;
  progress: number;
  message: string;
  completed: boolean;
  error?: string;
}

export function AssetMigrationTool() {
  const [migrationStatus, setMigrationStatus] = useState<MigrationStatus>({
    isRunning: false,
    progress: 0,
    message: 'Ready to migrate assets',
    completed: false
  });
  const { toast } = useToast();
  const { canAccess } = usePermissions();

  const canMigrate = canAccess('assets', 'create');

  const runMigration = async () => {
    if (!canMigrate) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to run asset migration",
        variant: "destructive"
      });
      return;
    }

    setMigrationStatus({
      isRunning: true,
      progress: 10,
      message: 'Starting asset migration...',
      completed: false
    });

    try {
      setMigrationStatus(prev => ({ ...prev, progress: 30, message: 'Migrating airline logos...' }));

      // Call the migration function
      const { error } = await supabase.rpc('migrate_existing_assets');

      if (error) {
        throw error;
      }

      setMigrationStatus(prev => ({ ...prev, progress: 80, message: 'Finalizing migration...' }));

      // Brief pause for UI feedback
      await new Promise(resolve => setTimeout(resolve, 1000));

      setMigrationStatus({
        isRunning: false,
        progress: 100,
        message: 'Asset migration completed successfully!',
        completed: true
      });

      toast({
        title: "Migration Complete",
        description: "All existing assets have been migrated to the assets system"
      });

    } catch (error) {
      console.error('Migration error:', error);
      setMigrationStatus({
        isRunning: false,
        progress: 0,
        message: 'Migration failed',
        completed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      toast({
        title: "Migration Failed",
        description: "Failed to migrate assets. Check console for details.",
        variant: "destructive"
      });
    }
  };

  if (!canMigrate) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Asset Migration Tool
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This tool will migrate existing airline logos, aircraft icons, and static assets 
            into the unified assets system. This is a one-time operation.
          </AlertDescription>
        </Alert>

        {migrationStatus.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {migrationStatus.error}
            </AlertDescription>
          </Alert>
        )}

        {migrationStatus.isRunning && (
          <div className="space-y-2">
            <Progress value={migrationStatus.progress} className="w-full" />
            <p className="text-sm text-muted-foreground">{migrationStatus.message}</p>
          </div>
        )}

        {migrationStatus.completed && (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm">{migrationStatus.message}</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">Migration includes:</p>
            <div className="flex gap-2">
              <Badge variant="outline">Airline Logos</Badge>
              <Badge variant="outline">Aircraft Icons</Badge>
              <Badge variant="outline">Static Files</Badge>
            </div>
          </div>
          <Button 
            onClick={runMigration}
            disabled={migrationStatus.isRunning || migrationStatus.completed}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {migrationStatus.completed ? 'Migration Complete' : 'Run Migration'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}