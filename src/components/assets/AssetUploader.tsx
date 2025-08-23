import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Upload, X, FileImage } from 'lucide-react';
import { useAssetUpload } from '@/hooks/useAssetUpload';

interface AssetUploaderProps {
  onClose: () => void;
  onUploadComplete: () => void;
}

// Enhanced asset categories
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

export function AssetUploader({ onClose, onUploadComplete }: AssetUploaderProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [category, setCategory] = useState('general');
  const [pageContext, setPageContext] = useState('general');
  const [altText, setAltText] = useState('');
  const [tags, setTags] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const { uploading, uploadAssets, formatFileSize } = useAssetUpload();

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles(prev => [...prev, ...selectedFiles]);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles(prev => [...prev, ...droppedFiles]);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    const success = await uploadAssets(files, {
      category,
      pageContext,
      altText,
      tags,
      isPublic
    });

    if (success) {
      onUploadComplete();
      
      // Reset form
      setFiles([]);
      setCategory('general');
      setPageContext('general');
      setAltText('');
      setTags('');
      setIsPublic(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload Assets</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* File Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors"
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">Drop files here or click to browse</p>
            <p className="text-sm text-muted-foreground mb-4">
              Support for images, documents, and other file types
            </p>
            <input
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
              accept="image/*,.pdf,.doc,.docx,.txt"
            />
            <Button asChild>
              <label htmlFor="file-upload" className="cursor-pointer">
                Select Files
              </label>
            </Button>
          </div>

          {/* Selected Files */}
          {files.length > 0 && (
            <div className="space-y-2">
              <Label>Selected Files ({files.length})</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                    <div className="flex items-center gap-2">
                      <FileImage className="h-4 w-4" />
                      <span className="text-sm font-medium">{file.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({formatFileSize(file.size)})
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Asset Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="pageContext">Page Context</Label>
                <Select value={pageContext} onValueChange={setPageContext}>
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
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="logo, header, branding"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="alt-text">Alt Text (for accessibility)</Label>
            <Textarea
              id="alt-text"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="Describe the asset for accessibility purposes"
              rows={2}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="public"
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
            <Label htmlFor="public">Make assets public (visible to all users)</Label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={files.length === 0 || uploading}
            >
              {uploading ? 'Uploading...' : `Upload ${files.length} Asset(s)`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}