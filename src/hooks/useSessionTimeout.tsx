import { useState, useEffect, useCallback } from 'react';
import { useSimpleAuth } from './useSimpleAuth';
import { toast } from 'sonner';

interface SessionTimeoutConfig {
  warningTime: number; // Minutes before warning
  timeoutTime: number; // Minutes before timeout
}

export const useSessionTimeout = (config: SessionTimeoutConfig = { warningTime: 25, timeoutTime: 30 }) => {
  const { user, signOut } = useSimpleAuth();
  const [timeLeft, setTimeLeft] = useState<number>(config.timeoutTime * 60);
  const [isWarningShown, setIsWarningShown] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());

  const resetTimer = useCallback(() => {
    setLastActivity(Date.now());
    setTimeLeft(config.timeoutTime * 60);
    setIsWarningShown(false);
  }, [config.timeoutTime]);

  const extendSession = useCallback(() => {
    resetTimer();
    toast.success('Session extended successfully');
  }, [resetTimer]);

  useEffect(() => {
    if (!user) return;

    // Activity listeners
    const activities = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    const activityHandler = () => {
      if (Date.now() - lastActivity > 60000) { // Only reset if > 1 minute of inactivity
        resetTimer();
      }
    };

    activities.forEach(activity => {
      document.addEventListener(activity, activityHandler, true);
    });

    // Timer countdown
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        const newTimeLeft = prev - 1;
        
        // Show warning at warning threshold
        if (newTimeLeft === config.warningTime * 60 && !isWarningShown) {
          setIsWarningShown(true);
          toast.warning(
            `Session expiring in ${config.warningTime} minutes. Click here to extend.`,
            {
              duration: 10000,
              action: {
                label: 'Extend Session',
                onClick: extendSession
              }
            }
          );
        }

        // Auto logout at timeout
        if (newTimeLeft <= 0) {
          toast.error('Session expired. You will be redirected to login.');
          signOut();
        }

        return newTimeLeft;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
      activities.forEach(activity => {
        document.removeEventListener(activity, activityHandler, true);
      });
    };
  }, [user, config.warningTime, config.timeoutTime, isWarningShown, lastActivity, extendSession, signOut, resetTimer]);

  return {
    timeLeft,
    extendSession,
    minutesLeft: Math.floor(timeLeft / 60),
    isWarningShown
  };
};