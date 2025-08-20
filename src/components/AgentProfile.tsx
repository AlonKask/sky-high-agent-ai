import React from 'react';
import { useAuth } from '@/hooks/useAuthOptimized';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { User, BarChart3, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AgentProfileProps {
  className?: string;
}

export const AgentProfile: React.FC<AgentProfileProps> = ({ className = '' }) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const getDisplayName = () => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }
    if (user?.email) {
      const emailParts = user.email.split('@')[0];
      return emailParts.charAt(0).toUpperCase() + emailParts.slice(1);
    }
    return 'Agent';
  };

  const handleStatistics = () => {
    navigate('/agent-statistics');
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
      navigate('/auth');
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className={`flex items-center ${className}`}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2 hover:bg-accent/50">
            <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
              <User className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-medium">{getDisplayName()}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={handleStatistics} className="cursor-pointer">
            <BarChart3 className="h-4 w-4 mr-2" />
            Agent Statistics
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive">
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default AgentProfile;