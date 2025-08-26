import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Inbox, 
  Send, 
  FileText, 
  Archive, 
  Trash2, 
  Search,
  Calendar,
  Filter,
  Mail,
  Plus,
  Settings
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useGmailIntegration } from "@/hooks/useGmailIntegration";

interface EmailSidebarProps {
  selectedFolder: string;
  onFolderSelect: (folder: string) => void;
  searchTerm: string;
  onSearchChange: (search: string) => void;
  dateFilter: string;
  onDateFilterChange: (filter: string) => void;
  sortBy: string;
  onSortByChange: (sort: string) => void;
  onCompose: () => void;
  isCollapsed?: boolean;
}

const EmailSidebar = ({
  selectedFolder,
  onFolderSelect,
  searchTerm,
  onSearchChange,
  dateFilter,
  onDateFilterChange,
  sortBy,
  onSortByChange,
  onCompose,
  isCollapsed = false
}: EmailSidebarProps) => {
  const { authStatus } = useGmailIntegration();

  const folders = [
    { id: 'inbox', label: 'Inbox', icon: Inbox, count: 12 },
    { id: 'sent', label: 'Sent', icon: Send, count: 8 },
    { id: 'drafts', label: 'Drafts', icon: FileText, count: 3 },
    { id: 'archive', label: 'Archive', icon: Archive, count: 45 },
    { id: 'trash', label: 'Trash', icon: Trash2, count: 2 }
  ];

  if (isCollapsed) {
    return (
      <div className="w-16 border-r bg-muted/30 p-2 space-y-2">
        <Button 
          onClick={onCompose}
          size="sm" 
          className="w-full p-2"
          title="Compose"
        >
          <Plus className="h-4 w-4" />
        </Button>
        {folders.map((folder) => {
          const Icon = folder.icon;
          return (
            <Button
              key={folder.id}
              variant={selectedFolder === folder.id ? "default" : "ghost"}
              size="sm"
              className="w-full p-2"
              onClick={() => onFolderSelect(folder.id)}
              title={folder.label}
            >
              <Icon className="h-4 w-4" />
            </Button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="w-64 border-r bg-muted/30 p-4 space-y-6">
      {/* Compose Button */}
      <Button onClick={onCompose} className="w-full gap-2">
        <Plus className="h-4 w-4" />
        Compose
      </Button>

      {/* Gmail Status */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4" />
          <span className="text-sm font-medium">Gmail Status</span>
        </div>
        <Badge variant={authStatus.isConnected ? "default" : "outline"} className="w-full justify-center">
          {authStatus.isConnected ? `Connected` : 'Disconnected'}
        </Badge>
        {authStatus.isConnected && authStatus.userEmail && (
          <p className="text-xs text-muted-foreground truncate">{authStatus.userEmail}</p>
        )}
        {authStatus.lastSync && (
          <p className="text-xs text-muted-foreground">
            Last sync: {new Date(authStatus.lastSync).toLocaleString()}
          </p>
        )}
      </div>

      {/* Search */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4" />
          <span className="text-sm font-medium">Search</span>
        </div>
        <Input
          placeholder="Search emails..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full"
        />
      </div>

      {/* Folders */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          <span className="text-sm font-medium">Folders</span>
        </div>
        <div className="space-y-1">
          {folders.map((folder) => {
            const Icon = folder.icon;
            return (
              <Button
                key={folder.id}
                variant={selectedFolder === folder.id ? "default" : "ghost"}
                className="w-full justify-start gap-3"
                onClick={() => onFolderSelect(folder.id)}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1 text-left">{folder.label}</span>
                {folder.count > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {folder.count}
                  </Badge>
                )}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <span className="text-sm font-medium">Filters</span>
        </div>
        
        <div className="space-y-2">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Date Range</label>
            <Select value={dateFilter} onValueChange={onDateFilterChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Sort By</label>
            <Select value={sortBy} onValueChange={onSortByChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date_desc">Newest First</SelectItem>
                <SelectItem value="date_asc">Oldest First</SelectItem>
                <SelectItem value="subject">Subject A-Z</SelectItem>
                <SelectItem value="sender">Sender A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailSidebar;