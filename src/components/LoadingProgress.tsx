import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Plane, Database, Mail } from 'lucide-react';

interface LoadingProgressProps {
  progress: number;
  status: string;
  showSteps?: boolean;
}

const LoadingProgress: React.FC<LoadingProgressProps> = ({ 
  progress, 
  status, 
  showSteps = true 
}) => {
  const steps = [
    { icon: Plane, label: 'Parsing flight data', threshold: 30 },
    { icon: Database, label: 'Database enhancement', threshold: 60 },
    { icon: Mail, label: 'Preparing email', threshold: 90 }
  ];

  return (
    <Card className="w-full">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <div className="animate-spin">
              <Plane className="h-5 w-5 text-primary" />
            </div>
            <span className="text-sm font-medium">{status}</span>
          </div>
          
          <Progress value={progress} className="h-2" />
          
          <div className="text-center text-sm text-muted-foreground">
            {Math.round(progress)}% complete
          </div>
          
          {showSteps && (
            <div className="space-y-2">
              {steps.map((step, index) => {
                const isCompleted = progress >= step.threshold;
                const isCurrent = progress >= (index > 0 ? steps[index - 1].threshold : 0) && progress < step.threshold;
                
                return (
                  <div 
                    key={index}
                    className={`flex items-center space-x-2 text-sm ${
                      isCompleted ? 'text-green-600' : 
                      isCurrent ? 'text-primary' : 
                      'text-muted-foreground'
                    }`}
                  >
                    <step.icon className={`h-4 w-4 ${
                      isCompleted ? 'text-green-600' : 
                      isCurrent ? 'text-primary animate-pulse' : 
                      'text-muted-foreground'
                    }`} />
                    <span>{step.label}</span>
                    {isCompleted && <span className="text-green-600">✓</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default LoadingProgress;