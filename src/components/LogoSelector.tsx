import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AssetPicker } from '@/components/assets/AssetPicker';
import { supabase } from '@/integrations/supabase/client';
import { Image, Settings2 } from 'lucide-react';

interface Asset {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  asset_category: string;
  asset_source: string;
  alt_text?: string;
  external_url?: string;
}

interface LogoSelectorProps {
  selectedLogoId?: string;
  onLogoSelect: (asset: Asset | null) => void;
  className?: string;
}

export function LogoSelector({ selectedLogoId, onLogoSelect, className }: LogoSelectorProps) {
  const [selectedLogo, setSelectedLogo] = useState<Asset | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  // Load selected logo details
  useEffect(() => {
    const loadSelectedLogo = async () => {
      if (!selectedLogoId) {
        setSelectedLogo(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('assets')
          .select('*')
          .eq('id', selectedLogoId)
          .single();

        if (!error && data) {
          setSelectedLogo(data);
        }
      } catch (error) {
        console.error('Failed to load selected logo:', error);
      }
    };

    loadSelectedLogo();
  }, [selectedLogoId]);

  const getAssetUrl = (asset: Asset): string => {
    if (asset.asset_source === 'external_cdn') {
      return asset.external_url || asset.file_path;
    }
    if (asset.asset_source === 'static') {
      return asset.file_path;
    }
    if (asset.asset_source === 'supabase_storage') {
      const { data } = supabase.storage.from('assets').getPublicUrl(asset.file_path);
      return data.publicUrl;
    }
    return asset.file_path || '/placeholder.svg';
  };

  const isImage = (fileType: string) => fileType.startsWith('image/') || fileType === 'image';

  const handleLogoSelect = (asset: Asset) => {
    setSelectedLogo(asset);
    onLogoSelect(asset);
    setIsPickerOpen(false);
  };

  const handleClearLogo = () => {
    setSelectedLogo(null);
    onLogoSelect(null);
  };

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Image className="h-4 w-4" />
            <span className="font-medium text-sm">Email Logo</span>
          </div>
          <Badge variant="secondary" className="text-xs">
            Company Branding
          </Badge>
        </div>

        {selectedLogo ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border">
              {isImage(selectedLogo.file_type) ? (
                <img
                  src={getAssetUrl(selectedLogo)}
                  alt={selectedLogo.alt_text || selectedLogo.file_name}
                  className="w-10 h-10 object-contain rounded border bg-white"
                />
              ) : (
                <div className="w-10 h-10 bg-muted rounded border flex items-center justify-center">
                  <Image className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {selectedLogo.file_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {selectedLogo.asset_source === 'external_cdn' ? 'External' : selectedLogo.file_type}
                </p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsPickerOpen(true)}
                className="flex-1"
              >
                <Settings2 className="h-3 w-3 mr-1" />
                Change Logo
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearLogo}
              >
                Use Default
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg border-dashed border-2">
              <div className="w-10 h-10 bg-muted rounded border flex items-center justify-center">
                <Image className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">
                  Using default company logo
                </p>
                <p className="text-xs text-muted-foreground">
                  Select a custom logo to personalize your emails
                </p>
              </div>
            </div>
            
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsPickerOpen(true)}
              className="w-full"
            >
              <Settings2 className="h-3 w-3 mr-1" />
              Select Company Logo
            </Button>
          </div>
        )}

        <AssetPicker
          onAssetSelect={handleLogoSelect}
          selectedAssetId={selectedLogo?.id}
          category="company_logo"
          trigger={null}
          placeholder="Select Logo"
        />
      </CardContent>
    </Card>
  );
}