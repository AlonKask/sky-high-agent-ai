import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface RealtimeUpdateProps {
  onBookingUpdate?: (payload: any) => void;
  onEmailUpdate?: (payload: any) => void;
  onRequestUpdate?: (payload: any) => void;
  onNotificationUpdate?: (payload: any) => void;
}

export const useRealtimeUpdates = ({
  onBookingUpdate,
  onEmailUpdate,
  onRequestUpdate,
  onNotificationUpdate
}: RealtimeUpdateProps = {}) => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Set up real-time subscriptions for key tables
    const bookingsChannel = supabase
      .channel('bookings-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Booking update:', payload);
          onBookingUpdate?.(payload);
          
          if (payload.eventType === 'INSERT') {
            toast.success('New booking created!');
          } else if (payload.eventType === 'UPDATE') {
            toast.info('Booking updated');
          }
        }
      )
      .subscribe();

    const emailsChannel = supabase
      .channel('emails-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'email_exchanges',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Email update:', payload);
          onEmailUpdate?.(payload);
          
          if (payload.eventType === 'INSERT' && payload.new?.direction === 'inbound') {
            toast.info('New email received');
          }
        }
      )
      .subscribe();

    const requestsChannel = supabase
      .channel('requests-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'requests',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Request update:', payload);
          onRequestUpdate?.(payload);
          
          if (payload.eventType === 'INSERT') {
            toast.success('New travel request received!');
          }
        }
      )
      .subscribe();

    const notificationsChannel = supabase
      .channel('notifications-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Notification update:', payload);
          onNotificationUpdate?.(payload);
          
          const notification = payload.new;
          if (notification.priority === 'high') {
            toast.error(notification.title, {
              description: notification.message
            });
          } else {
            toast.info(notification.title, {
              description: notification.message
            });
          }
        }
      )
      .subscribe();

    // Cleanup subscriptions on unmount
    return () => {
      supabase.removeChannel(bookingsChannel);
      supabase.removeChannel(emailsChannel);
      supabase.removeChannel(requestsChannel);
      supabase.removeChannel(notificationsChannel);
    };
  }, [user, onBookingUpdate, onEmailUpdate, onRequestUpdate, onNotificationUpdate]);

  return null; // This hook doesn't render anything
};