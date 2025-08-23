import { useState, useCallback, useRef } from 'react';
import { FileImage, Upload, Search, Filter, Grid, List } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { AssetGallery } from '@/components/assets/AssetGallery';
import { AssetUploader } from '@/components/assets/AssetUploader';
import { AssetStats } from '@/components/assets/AssetStats';
import { useAssetUpload } from '@/hooks/useAssetUpload';
import { usePermissions } from '@/hooks/usePermissions';

export default function Assets() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPageContext, setSelectedPageContext] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showUploader, setShowUploader] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const dragCounterRef = useRef(0);
  const { canAccess } = usePermissions();
  const { uploading, uploadAssets } = useAssetUpload();

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'airline_logo', label: 'Airline Logos' },
    { value: 'aircraft_icon', label: 'Aircraft Icons' },
    { value: 'company_logo', label: 'Company Logos' },
    { value: 'external_cdn', label: 'External CDN' },
    { value: 'static_file', label: 'Static Files' },
    { value: 'general', label: 'General' }
  ];

  const pageContexts = [
    { value: 'all', label: 'All Pages' },
    { value: 'general', label: 'General' },
    { value: 'email_templates', label: 'Email Templates' },
    { value: 'client_reports', label: 'Client Reports' },
    { value: 'company_branding', label: 'Company Branding' },
    { value: 'airline_data', label: 'Airline Data' },
    { value: 'user_profiles', label: 'User Profiles' },
    { value: 'booking_forms', label: 'Booking Forms' },
    { value: 'dashboard', label: 'Dashboard' }
  ];

  const canManageAssets = canAccess('assets', 'create');

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    dragCounterRef.current = 0;

    if (!canManageAssets) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    // Filter valid files (images, documents, etc.)
    const validFiles = files.filter(file => {
      const validTypes = [
        'image/',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
      ];
      return validTypes.some(type => file.type.startsWith(type));
    });

    if (validFiles.length === 0) {
      return;
    }

    const success = await uploadAssets(validFiles, {
      category: 'general',
      pageContext: 'general',
      isPublic: false
    });

    if (success) {
      setRefreshTrigger(prev => prev + 1);
    }
  }, [canManageAssets, uploadAssets]);

  const handleUploadComplete = () => {
    setShowUploader(false);
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div 
      className="container mx-auto p-6 space-y-6 relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag and Drop Overlay */}
      {isDragOver && canManageAssets && (
        <div className="fixed inset-0 z-50 bg-primary/5 backdrop-blur-sm border-2 border-dashed border-primary/50 flex items-center justify-center">
          <div className="bg-background/90 backdrop-blur-sm rounded-lg p-8 border border-border shadow-lg text-center">
            <Upload className="h-16 w-16 mx-auto mb-4 text-primary" />
            <h3 className="text-2xl font-semibold mb-2">Drop Assets Here</h3>
            <p className="text-muted-foreground">
              {uploading ? 'Uploading files...' : 'Release to upload your files'}
            </p>
          </div>
        </div>
      )}

      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileImage className="h-8 w-8" />
            Assets
          </h1>
          <p className="text-muted-foreground">
            Manage and organize all your project assets
          </p>
        </div>
        {canManageAssets && (
          <Button onClick={() => setShowUploader(true)} className="gap-2">
            <Upload className="h-4 w-4" />
            Upload Assets
          </Button>
        )}
      </div>


      {/* Stats */}
      <AssetStats />

      <Tabs defaultValue="gallery" className="space-y-6">
        <TabsList>
          <TabsTrigger value="gallery">Gallery</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="gallery" className="space-y-6">
          {/* Search and Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Search & Filter</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search assets..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex flex-col sm:flex-row gap-2 flex-1">
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="w-full sm:w-44">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent className="z-50">
                        {categories.map((category) => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={selectedPageContext} onValueChange={setSelectedPageContext}>
                      <SelectTrigger className="w-full sm:w-44">
                        <SelectValue placeholder="Page Context" />
                      </SelectTrigger>
                      <SelectContent className="z-50">
                        {pageContexts.map((context) => (
                          <SelectItem key={context.value} value={context.value}>
                            {context.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 justify-center sm:justify-start">
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                    >
                      <Grid className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Asset Gallery */}
          <AssetGallery
            searchTerm={searchTerm}
            category={selectedCategory}
            pageContext={selectedPageContext}
            viewMode={viewMode}
            refreshTrigger={refreshTrigger}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Asset Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <FileImage className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Asset analytics and usage tracking will be displayed here.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Asset Uploader Modal */}
      {showUploader && (
        <AssetUploader 
          onClose={() => setShowUploader(false)}
          onUploadComplete={handleUploadComplete}
        />
      )}
      </div>
    </div>
  );
}