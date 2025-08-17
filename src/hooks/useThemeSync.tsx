import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

export const useThemeSync = () => {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();

  // Load theme from database when user logs in
  useEffect(() => {
    const loadUserTheme = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('theme')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error loading user theme:', error);
          return;
        }

        // Apply theme if found and different from current
        if (data?.theme && data.theme !== theme) {
          setTheme(data.theme);
        }
      } catch (error) {
        console.error('Error in loadUserTheme:', error);
      }
    };

    loadUserTheme();
  }, [user, setTheme]);

  // Save theme to database when it changes (but only if user is logged in)
  const saveThemeToDatabase = async (newTheme: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          theme: newTheme,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error saving theme to database:', error);
      }
    } catch (error) {
      console.error('Error in saveThemeToDatabase:', error);
    }
  };

  return {
    theme,
    setTheme: (newTheme: string) => {
      setTheme(newTheme);
      saveThemeToDatabase(newTheme);
    }
  };
};