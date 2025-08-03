import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole, UserRole } from '@/hooks/useUserRole';
import { useRoleView } from '@/contexts/RoleViewContext';
import { RoleSelector } from '@/components/RoleSelector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toastHelpers, toast } from '@/utils/toastHelpers';
import { supabase } from '@/integrations/supabase/client';
import {
  User,
  Bell,
  Shield,
  Palette,
  Mail,
  Phone,
  Lock,
  Globe,
  Save,
  Users,
  UserCog,
  Database,
  Calendar,
  BarChart3,
  DollarSign,
  Terminal,
  Bug,
  Code,
  Settings as SettingsIcon
} from 'lucide-react';

interface UserPreferences {
  email_notifications: boolean;
  sms_notifications: boolean;
  marketing_emails: boolean;
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  currency: string;
}

const Settings = () => {
  const { user } = useAuth();
  const { role } = useUserRole();
  const { selectedViewRole, setSelectedViewRole, isRoleSwitchingEnabled } = useRoleView();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company: ''
  });
  const [preferences, setPreferences] = useState<UserPreferences>({
    email_notifications: true,
    sms_notifications: false,
    marketing_emails: false,
    theme: 'system' as const,
    language: 'en',
    timezone: 'UTC',
    currency: 'USD'
  });

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  // Role is now managed by global context

  const fetchUserData = async () => {
    try {
      setLoading(true);
      
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .maybeSingle();
      
      if (profileError) {
        console.error('Error fetching profile:', profileError);
      }
      
      setProfile({
        first_name: profileData?.first_name || '',
        last_name: profileData?.last_name || '',
        email: profileData?.email || user?.email || '',
        phone: profileData?.phone || '',
        company: profileData?.company || ''
      });

      // Fetch preferences
      const { data: preferencesData, error: preferencesError } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();
      
      if (preferencesError) {
        console.error('Error fetching preferences:', preferencesError);
      }
      
      setPreferences({
        email_notifications: preferencesData?.email_notifications ?? true,
        sms_notifications: preferencesData?.sms_notifications ?? false,
        marketing_emails: false, // Not in DB schema yet
        theme: (preferencesData?.theme as 'light' | 'dark' | 'system') || 'system',
        language: preferencesData?.language || 'en',
        timezone: preferencesData?.timezone || 'UTC',
        currency: preferencesData?.currency || 'USD'
      });
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user?.id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          email: profile.email,
          phone: profile.phone,
          company: profile.company,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully"
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: "Failed to save profile",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const savePreferences = async () => {
    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user?.id,
          ...preferences,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Preferences updated successfully"
      });
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: "Error",
        description: "Failed to save preferences",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const renderRoleSpecificContent = () => {
    switch (selectedViewRole) {
      case 'admin':
        return (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" className="w-full justify-start">
                  <Users className="h-4 w-4 mr-2" />
                  View All Users
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <UserCog className="h-4 w-4 mr-2" />
                  Manage User Roles
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Shield className="h-4 w-4 mr-2" />
                  Security Audit
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SettingsIcon className="h-5 w-5" />
                  System Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" className="w-full justify-start">
                  <SettingsIcon className="h-4 w-4 mr-2" />
                  Global Settings
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Database className="h-4 w-4 mr-2" />
                  Database Management
                </Button>
              </CardContent>
            </Card>
          </>
        );

      case 'manager':
        return (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Team Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" className="w-full justify-start">
                  <Users className="h-4 w-4 mr-2" />
                  Team Overview
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Management
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Performance Reports
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Business Operations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" className="w-full justify-start">
                  <SettingsIcon className="h-4 w-4 mr-2" />
                  Workflow Settings
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Commission Settings
                </Button>
              </CardContent>
            </Card>
          </>
        );

      case 'admin':
        return (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Terminal className="h-5 w-5" />
                  Developer Tools
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" className="w-full justify-start">
                  <Terminal className="h-4 w-4 mr-2" />
                  API Console
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Bug className="h-4 w-4 mr-2" />
                  Debug Logs
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Code className="h-4 w-4 mr-2" />
                  System Monitoring
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Environment Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" className="w-full justify-start">
                  <SettingsIcon className="h-4 w-4 mr-2" />
                  Environment Variables
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Database className="h-4 w-4 mr-2" />
                  Database Schema
                </Button>
              </CardContent>
            </Card>
          </>
        );

      default:
        return (
          <>
            {/* Notification Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                  </div>
                  <Switch
                    checked={preferences.email_notifications}
                    onCheckedChange={(checked) => setPreferences({...preferences, email_notifications: checked})}
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>SMS Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive urgent notifications via SMS</p>
                  </div>
                  <Switch
                    checked={preferences.sms_notifications}
                    onCheckedChange={(checked) => setPreferences({...preferences, sms_notifications: checked})}
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Marketing Emails</Label>
                    <p className="text-sm text-muted-foreground">Receive promotional content</p>
                  </div>
                  <Switch
                    checked={preferences.marketing_emails}
                    onCheckedChange={(checked) => setPreferences({...preferences, marketing_emails: checked})}
                  />
                </div>
              </CardContent>
            </Card>

            {/* App Preferences */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  App Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Theme</Label>
                  <Select value={preferences.theme} onValueChange={(value) => setPreferences({...preferences, theme: value as any})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select value={preferences.language} onValueChange={(value) => setPreferences({...preferences, language: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select value={preferences.currency} onValueChange={(value) => setPreferences({...preferences, currency: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={savePreferences} disabled={saving} className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Preferences'}
                </Button>
              </CardContent>
            </Card>
          </>
        );
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences
            {role === 'admin' && selectedViewRole !== role && (
              <span className="ml-2 text-primary font-medium">
                • Viewing as {selectedViewRole}
              </span>
            )}
          </p>
        </div>
        <Badge variant="outline">
          <User className="h-3 w-3 mr-1" />
          {user?.email}
        </Badge>
      </div>

      {/* Role Selector for users with role switching enabled */}
      {isRoleSwitchingEnabled && role && (
        <RoleSelector
          currentRole={role}
          selectedViewRole={selectedViewRole}
          onRoleChange={setSelectedViewRole}
          className="mb-6"
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  value={profile.first_name}
                  onChange={(e) => setProfile({...profile, first_name: e.target.value})}
                  placeholder="Enter first name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  value={profile.last_name}
                  onChange={(e) => setProfile({...profile, last_name: e.target.value})}
                  placeholder="Enter last name"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({...profile, email: e.target.value})}
                placeholder="Enter email"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={profile.phone}
                onChange={(e) => setProfile({...profile, phone: e.target.value})}
                placeholder="Enter phone number"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={profile.company}
                onChange={(e) => setProfile({...profile, company: e.target.value})}
                placeholder="Enter company name"
              />
            </div>

            <Button onClick={saveProfile} disabled={saving} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Profile'}
            </Button>
          </CardContent>
        </Card>

        {/* Role-specific content */}
        {renderRoleSpecificContent()}

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Two-Factor Authentication</Label>
              <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
              <Button variant="outline" className="w-full">
                <Lock className="h-4 w-4 mr-2" />
                Enable 2FA
              </Button>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <Label>Change Password</Label>
              <p className="text-sm text-muted-foreground">Update your account password</p>
              <Button variant="outline" className="w-full">
                <Lock className="h-4 w-4 mr-2" />
                Change Password
              </Button>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <Label>Active Sessions</Label>
              <p className="text-sm text-muted-foreground">Manage your active login sessions</p>
              <Button variant="outline" className="w-full">
                <Globe className="h-4 w-4 mr-2" />
                View Sessions
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;