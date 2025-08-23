import { useState } from 'react';
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
import { AssetMigrationTool } from '@/components/assets/AssetMigrationTool';
import { usePermissions } from '@/hooks/usePermissions';

export default function Assets() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showUploader, setShowUploader] = useState(false);
  const { canAccess } = usePermissions();

  const categories = [
    { value: 'all', label: 'All Assets' },
    { value: 'airline_logo', label: 'Airline Logos' },
    { value: 'aircraft_icon', label: 'Aircraft Icons' },
    { value: 'company_logo', label: 'Company Logos' },
    { value: 'external_cdn', label: 'External CDN' },
    { value: 'static_file', label: 'Static Files' },
    { value: 'general', label: 'General' }
  ];

  const canManageAssets = canAccess('assets', 'create');

  return (
    <div className="container mx-auto p-6 space-y-6">
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

      {/* Migration Tool */}
      <AssetMigrationTool />

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
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search assets by name, tags, or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
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
            </CardContent>
          </Card>

          {/* Asset Gallery */}
          <AssetGallery
            searchTerm={searchTerm}
            category={selectedCategory}
            viewMode={viewMode}
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
          onUploadComplete={() => {
            setShowUploader(false);
            // Trigger refresh of gallery
          }}
        />
      )}
    </div>
  );
}