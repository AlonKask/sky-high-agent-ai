import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { formatInTimeZone } from 'date-fns-tz';

interface TimeZone {
  code: string;
  timezone: string;
  city: string;
}

const timeZones: TimeZone[] = [
  { code: 'HNL', timezone: 'Pacific/Honolulu', city: 'Honolulu' },
  { code: 'LAX', timezone: 'America/Los_Angeles', city: 'Los Angeles' },
  { code: 'DEN', timezone: 'America/Denver', city: 'Denver' },
  { code: 'CHI', timezone: 'America/Chicago', city: 'Chicago' },
  { code: 'NYC', timezone: 'America/New_York', city: 'New York' },
  { code: 'LON', timezone: 'Europe/London', city: 'London' },
  { code: 'DEL', timezone: 'Asia/Kolkata', city: 'Delhi' },
  { code: 'MNL', timezone: 'Asia/Manila', city: 'Manila' },
  { code: 'SYD', timezone: 'Australia/Sydney', city: 'Sydney' },
];

interface WorldClockProps {
  variant?: 'full' | 'compact' | 'minimal';
  className?: string;
}

export const WorldClock: React.FC<WorldClockProps> = ({ 
  variant = 'full', 
  className = '' 
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (variant === 'minimal') {
    return (
      <div className={`flex items-center gap-1 text-xs text-muted-foreground ${className}`}>
        <Clock className="h-3 w-3" />
        <span>{formatInTimeZone(currentTime, 'America/New_York', 'HH:mm')}</span>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`w-full overflow-x-auto ${className}`}>
        <div className="flex gap-2 sm:gap-3 lg:gap-4 text-xs justify-center min-w-max px-4 py-2">
          {timeZones.map((tz) => (
            <div key={tz.code} className="text-center flex-shrink-0">
              <div 
                className="rounded-full bg-gradient-to-br from-primary/10 to-primary/20 border border-primary/20 flex flex-col items-center justify-center mb-1 hover:scale-105 transition-transform duration-200"
                style={{
                  width: 'clamp(2.25rem, 3.5vw, 3.5rem)',
                  height: 'clamp(2.25rem, 3.5vw, 3.5rem)'
                }}
              >
                <div 
                  className="font-mono font-bold text-foreground leading-none"
                  style={{ fontSize: 'clamp(0.55rem, 1.2vw, 0.75rem)' }}
                >
                  {formatInTimeZone(currentTime, tz.timezone, 'HH:mm')}
                </div>
                <div 
                  className="text-muted-foreground leading-none mt-0.5"
                  style={{ fontSize: 'clamp(0.45rem, 1vw, 0.625rem)' }}
                >
                  {tz.code}
                </div>
              </div>
              <div 
                className="text-muted-foreground hidden sm:block"
                style={{ fontSize: 'clamp(0.45rem, 0.8vw, 0.625rem)' }}
              >
                {formatInTimeZone(currentTime, tz.timezone, 'd MMM')}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-card rounded-lg border p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <Clock className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">World Time</span>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        {timeZones.map((tz) => {
          const time = formatInTimeZone(currentTime, tz.timezone, 'HH:mm');
          const date = formatInTimeZone(currentTime, tz.timezone, 'd MMM');
          
          return (
            <div key={tz.code} className="text-center space-y-1">
              <div className="text-lg font-mono font-semibold text-foreground">
                {time}
              </div>
              <div className="text-xs text-muted-foreground">
                {tz.code}
              </div>
              <div className="text-xs text-muted-foreground">
                {date}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WorldClock;