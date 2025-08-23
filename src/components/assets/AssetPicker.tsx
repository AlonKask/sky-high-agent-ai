import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Image as ImageIcon, FileText, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Asset {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  asset_category: string;
  asset_source: string;
  external_url?: string;
  alt_text?: string;
  tags: any; // Database returns Json type, we'll handle conversion
  metadata: any;
}

interface AssetPickerProps {
  onAssetSelect: (asset: Asset) => void;
  selectedAssetId?: string;
  category?: string;
  trigger?: React.ReactNode;
  placeholder?: string;
}

export function AssetPicker({ 
  onAssetSelect, 
  selectedAssetId, 
  category, 
  trigger,
  placeholder = "Select an asset..."
}: AssetPickerProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(category || 'all');
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const categories = [
    { value: 'all', label: 'All Assets' },
    { value: 'airline_logo', label: 'Airline Logos' },
    { value: 'aircraft_icon', label: 'Aircraft Icons' },
    { value: 'logo', label: 'Logos' },
    { value: 'icon', label: 'Icons' },
    { value: 'avatar', label: 'Avatars' },
    { value: 'static_file', label: 'Static Files' },
    { value: 'general', label: 'General' }
  ];

  const fetchAssets = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('assets')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (selectedCategory !== 'all') {
        query = query.eq('asset_category', selectedCategory);
      }

      if (searchTerm) {
        query = query.or(`file_name.ilike.%${searchTerm}%,alt_text.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query.limit(50);

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

  useEffect(() => {
    if (isOpen) {
      fetchAssets();
    }
  }, [searchTerm, selectedCategory, isOpen]);

  const handleAssetSelect = (asset: Asset) => {
    onAssetSelect(asset);
    setIsOpen(false);
  };

  const getAssetUrl = (asset: Asset) => {
    if (asset.asset_source === 'external_cdn' && asset.external_url) {
      return asset.external_url;
    }
    if (asset.asset_source === 'static') {
      return asset.file_path;
    }
    if (asset.asset_source === 'upload') {
      return `https://ekrwjfdypqzequovmvjn.supabase.co/storage/v1/object/public/assets/${asset.file_path}`;
    }
    return asset.file_path;
  };

  const selectedAsset = assets.find(asset => asset.id === selectedAssetId);

  const defaultTrigger = (
    <Button variant="outline" className="w-full justify-start gap-2">
      {selectedAsset ? (
        <>
          <div className="w-6 h-6 rounded overflow-hidden flex-shrink-0">
            <img
              src={getAssetUrl(selectedAsset)}
              alt={selectedAsset.alt_text || selectedAsset.file_name}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = '/placeholder.svg';
              }}
            />
          </div>
          <span className="truncate">{selectedAsset.file_name}</span>
        </>
      ) : (
        <>
          <ImageIcon className="h-4 w-4" />
          <span>{placeholder}</span>
        </>
      )}
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Select Asset</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search and Filter */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search assets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Asset Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[400px] overflow-y-auto">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-square bg-muted animate-pulse rounded" />
              ))
            ) : assets.length === 0 ? (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2" />
                <p>No assets found</p>
              </div>
            ) : (
              assets.map((asset) => (
                <Card
                  key={asset.id}
                  className={`cursor-pointer hover:shadow-md transition-shadow ${
                    asset.id === selectedAssetId ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => handleAssetSelect(asset)}
                >
                  <CardContent className="p-3">
                    <div className="aspect-square rounded overflow-hidden mb-2 relative">
                      {asset.id === selectedAssetId && (
                        <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-1">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                      {asset.file_type === 'image' ? (
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
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <FileText className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium truncate">{asset.file_name}</p>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">
                          {asset.asset_category}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {asset.asset_source}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}