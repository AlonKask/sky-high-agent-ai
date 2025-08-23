import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { FileImage, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

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
  tags: any;
  alt_text?: string;
  is_public: boolean;
  usage_count: number;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

interface AssetEditorProps {
  asset: Asset;
  onClose: () => void;
  onAssetUpdated: (updatedAsset: Asset) => void;
}

const assetCategories = [
  { value: 'general', label: 'General' },
  { value: 'airline_logo', label: 'Airline Logo' },
  { value: 'aircraft_icon', label: 'Aircraft Icon' },
  { value: 'logo', label: 'Logo' },
  { value: 'icon', label: 'Icon' },
  { value: 'avatar', label: 'Avatar' },
  { value: 'attachment', label: 'Attachment' },
  { value: 'static_file', label: 'Static File' }
];

const pageContexts = [
  { value: 'general', label: 'General' },
  { value: 'email_templates', label: 'Email Templates' },
  { value: 'client_reports', label: 'Client Reports' },
  { value: 'company_branding', label: 'Company Branding' },
  { value: 'airline_data', label: 'Airline Data' },
  { value: 'user_profiles', label: 'User Profiles' },
  { value: 'booking_forms', label: 'Booking Forms' },
  { value: 'dashboard', label: 'Dashboard' }
];

const assetFormSchema = z.object({
  file_name: z.string().min(1, 'File name is required'),
  alt_text: z.string().optional(),
  asset_category: z.string().min(1, 'Category is required'),
  page_context: z.string().min(1, 'Page context is required'),
  tags: z.string().optional(),
  is_public: z.boolean()
});

type AssetFormData = z.infer<typeof assetFormSchema>;

export function AssetEditor({ asset, onClose, onAssetUpdated }: AssetEditorProps) {
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<AssetFormData>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: {
      file_name: asset.file_name,
      alt_text: asset.alt_text || '',
      asset_category: asset.asset_category,
      page_context: asset.page_context || 'general',
      tags: Array.isArray(asset.tags) ? asset.tags.join(', ') : '',
      is_public: asset.is_public
    }
  });

  const watchedCategory = watch('asset_category');
  const watchedPageContext = watch('page_context');
  const watchedIsPublic = watch('is_public');

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

  const isImage = (fileType: string) => fileType.startsWith('image/') || fileType === 'image';

  const onSubmit = async (data: AssetFormData) => {
    setSaving(true);
    
    try {
      const updatedAsset = {
        file_name: data.file_name,
        alt_text: data.alt_text || null,
        asset_category: data.asset_category,
        page_context: data.page_context,
        tags: data.tags ? data.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
        is_public: data.is_public,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('assets')
        .update(updatedAsset)
        .eq('id', asset.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Asset updated successfully"
      });

      onAssetUpdated({ ...asset, ...updatedAsset });
      onClose();
      
    } catch (error) {
      console.error('Error updating asset:', error);
      toast({
        title: "Error",
        description: "Failed to update asset. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Asset</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Asset Preview */}
          <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-background flex items-center justify-center">
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
                <FileImage className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{asset.file_name}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {asset.asset_category}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {asset.asset_source}
                </Badge>
                {asset.page_context && (
                  <Badge variant="secondary" className="text-xs">
                    {asset.page_context}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file_name">File Name</Label>
              <Input
                id="file_name"
                {...register('file_name')}
                placeholder="Enter file name"
              />
              {errors.file_name && (
                <p className="text-sm text-destructive">{errors.file_name.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="asset_category">Category</Label>
                <Select 
                  value={watchedCategory} 
                  onValueChange={(value) => setValue('asset_category', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {assetCategories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.asset_category && (
                  <p className="text-sm text-destructive">{errors.asset_category.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="page_context">Page Context</Label>
                <Select 
                  value={watchedPageContext} 
                  onValueChange={(value) => setValue('page_context', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select page context" />
                  </SelectTrigger>
                  <SelectContent>
                    {pageContexts.map((context) => (
                      <SelectItem key={context.value} value={context.value}>
                        {context.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.page_context && (
                  <p className="text-sm text-destructive">{errors.page_context.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="alt_text">Alt Text (for accessibility)</Label>
              <Textarea
                id="alt_text"
                {...register('alt_text')}
                placeholder="Describe the asset for accessibility purposes"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                {...register('tags')}
                placeholder="logo, header, branding"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_public"
                checked={watchedIsPublic}
                onCheckedChange={(checked) => setValue('is_public', checked)}
              />
              <Label htmlFor="is_public">Make asset public (visible to all users)</Label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}