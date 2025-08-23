import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { FileImage, Download, Edit, Trash2, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSimpleAuth } from '@/hooks/useSimpleAuth';
import { AssetEditor } from './AssetEditor';

interface Asset {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  asset_category: string;
  asset_source: string;
  page_context?: string;
  external_url?: string;
  tags: any; // JSONB from Supabase
  alt_text?: string;
  is_public: boolean;
  usage_count: number;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

interface AssetGalleryProps {
  searchTerm: string;
  category: string;
  pageContext: string;
  viewMode: 'grid' | 'list';
  onAssetUpdated?: () => void;
}

export function AssetGallery({ searchTerm, category, pageContext, viewMode, onAssetUpdated }: AssetGalleryProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const { toast } = useToast();
  const { user } = useSimpleAuth();

  useEffect(() => {
    fetchAssets();
  }, [searchTerm, category, pageContext]);

  const fetchAssets = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('assets')
        .select('*')
        .or(`user_id.eq.${user.id},is_public.eq.true`) // Show user's own assets or public assets
        .order('created_at', { ascending: false });

      if (category !== 'all') {
        query = query.eq('asset_category', category);
      }

      if (pageContext !== 'all') {
        query = query.eq('page_context', pageContext);
      }

      if (searchTerm) {
        query = query.or(`file_name.ilike.%${searchTerm}%,alt_text.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setAssets(data || []);
    } catch (error) {
      console.error('Error fetching assets:', error);
      toast({
        title: "Error",
        description: "Failed to load assets",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteAsset = async (assetId: string) => {
    try {
      // Find the asset to get file path for storage deletion
      const asset = assets.find(a => a.id === assetId);
      
      // Delete from storage if it's an uploaded asset
      if (asset && asset.asset_source === 'supabase_storage') {
        await supabase.storage
          .from('CRM Assets')
          .remove([asset.file_path]);
      }

      // Delete from database
      const { error } = await supabase
        .from('assets')
        .delete()
        .eq('id', assetId);

      if (error) throw error;

      setAssets(assets.filter(asset => asset.id !== assetId));
      toast({
        title: "Success",
        description: "Asset deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting asset:', error);
      toast({
        title: "Error",
        description: "Failed to delete asset",
        variant: "destructive"
      });
    }
  };

  const getAssetUrl = (asset: Asset): string => {
    if (asset.asset_source === 'external_cdn' && asset.external_url) {
      return asset.external_url;
    }
    if (asset.asset_source === 'static') {
      return asset.file_path;
    }
    if (asset.asset_source === 'supabase_storage') {
      return `https://ekrwjfdypqzequovmvjn.supabase.co/storage/v1/object/public/CRM Assets/${asset.file_path}`;
    }
    return asset.file_path || '/placeholder.svg';
  };

  const downloadAsset = (asset: Asset) => {
    const url = getAssetUrl(asset);
    const link = document.createElement('a');
    link.href = url;
    link.download = asset.file_name;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getAssetSourceDisplay = (source: string): string => {
    const sourceMap: { [key: string]: string } = {
      'external_cdn': 'CDN',
      'supabase_storage': 'Storage',
      'static': 'Static'
    };
    return sourceMap[source] || source;
  };

  const isImage = (fileType: string) => fileType.startsWith('image/') || fileType === 'image';

  const handleAssetUpdated = (updatedAsset: Asset) => {
    setAssets(assets.map(asset => 
      asset.id === updatedAsset.id ? updatedAsset : asset
    ));
    onAssetUpdated?.();
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-3">
              <div className="aspect-square bg-muted rounded-lg mb-3"></div>
              <div className="h-4 bg-muted rounded mb-2"></div>
              <div className="h-3 bg-muted rounded w-2/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <FileImage className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">No assets found</h3>
          <p className="text-muted-foreground">
            {searchTerm || category !== 'all' 
              ? 'Try adjusting your search or filters'
              : 'Upload your first asset to get started'
            }
          </p>
        </CardContent>
      </Card>
    );
  }

  if (viewMode === 'list') {
    return (
      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {assets.map((asset) => (
              <div key={asset.id} className="p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                    {isImage(asset.file_type) ? (
                      <img 
                        src={getAssetUrl(asset)} 
                        alt={asset.alt_text || asset.file_name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/placeholder.svg';
                        }}
                      />
                    ) : (
                      <FileImage className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                   <div className="flex-1 min-w-0">
                     <h4 className="font-medium truncate">{asset.file_name}</h4>
                     <div className="flex items-center flex-wrap gap-1 mt-1">
                       <Badge variant="outline" className="text-xs">
                         {asset.asset_category}
                       </Badge>
                       <Badge variant="secondary" className="text-xs">
                         {getAssetSourceDisplay(asset.asset_source)}
                       </Badge>
                        <span className="text-xs text-muted-foreground">
                          {asset.asset_source === 'external_cdn' ? 'External' : formatFileSize(asset.file_size)}
                        </span>
                       {asset.is_public && (
                         <Badge variant="secondary" className="text-xs">Public</Badge>
                       )}
                     </div>
                   </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => window.open(getAssetUrl(asset), '_blank')}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setEditingAsset(asset)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => downloadAsset(asset)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Asset</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{asset.file_name}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteAsset(asset.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
      {assets.map((asset) => (
        <Card key={asset.id} className="group hover:shadow-md transition-shadow">
          <CardContent className="p-3">
            <div className="aspect-square rounded-lg overflow-hidden bg-muted mb-3 flex items-center justify-center">
              {isImage(asset.file_type) ? (
                <img 
                  src={getAssetUrl(asset)} 
                  alt={asset.alt_text || asset.file_name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/placeholder.svg';
                  }}
                />
              ) : (
                <FileImage className="h-12 w-12 text-muted-foreground" />
              )}
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-sm truncate" title={asset.file_name}>
                {asset.file_name}
              </h4>
              
              <div className="flex items-center flex-wrap gap-1">
                <Badge variant="outline" className="text-xs">
                  {asset.asset_category}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {getAssetSourceDisplay(asset.asset_source)}
                </Badge>
                {asset.is_public && (
                  <Badge variant="secondary" className="text-xs">Public</Badge>
                )}
              </div>
              
               <p className="text-xs text-muted-foreground truncate">
                 {asset.asset_source === 'external_cdn' ? 'External' : formatFileSize(asset.file_size)}
               </p>
              
               <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                 <Button 
                   variant="ghost" 
                   size="sm" 
                   className="h-7 w-7 p-0"
                   onClick={() => window.open(getAssetUrl(asset), '_blank')}
                   title="View"
                 >
                   <Eye className="h-3 w-3" />
                 </Button>
                 <Button 
                   variant="ghost" 
                   size="sm" 
                   className="h-7 w-7 p-0"
                   onClick={() => setEditingAsset(asset)}
                   title="Edit"
                 >
                   <Edit className="h-3 w-3" />
                 </Button>
                 <Button 
                   variant="ghost" 
                   size="sm" 
                   className="h-7 w-7 p-0"
                   onClick={() => downloadAsset(asset)}
                   title="Download"
                 >
                   <Download className="h-3 w-3" />
                 </Button>
                 <AlertDialog>
                   <AlertDialogTrigger asChild>
                     <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Delete">
                       <Trash2 className="h-3 w-3" />
                     </Button>
                   </AlertDialogTrigger>
                   <AlertDialogContent className="z-50">
                     <AlertDialogHeader>
                       <AlertDialogTitle>Delete Asset</AlertDialogTitle>
                       <AlertDialogDescription>
                         Are you sure you want to delete "{asset.file_name}"? This action cannot be undone.
                       </AlertDialogDescription>
                     </AlertDialogHeader>
                     <AlertDialogFooter>
                       <AlertDialogCancel>Cancel</AlertDialogCancel>
                       <AlertDialogAction onClick={() => deleteAsset(asset.id)}>
                         Delete
                       </AlertDialogAction>
                     </AlertDialogFooter>
                   </AlertDialogContent>
                 </AlertDialog>
               </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Asset Editor Modal */}
      {editingAsset && (
        <AssetEditor 
          asset={editingAsset}
          onClose={() => setEditingAsset(null)}
          onAssetUpdated={handleAssetUpdated}
        />
      )}
    </div>
  );
}