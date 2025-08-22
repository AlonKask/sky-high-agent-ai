import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileImage, HardDrive, Users, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSimpleAuth } from '@/hooks/useSimpleAuth';

interface AssetStatsData {
  totalAssets: number;
  totalSize: number;
  publicAssets: number;
  categoryCounts: Record<string, number>;
}

export function AssetStats() {
  const [stats, setStats] = useState<AssetStatsData>({
    totalAssets: 0,
    totalSize: 0,
    publicAssets: 0,
    categoryCounts: {}
  });
  const [loading, setLoading] = useState(true);
  const { user } = useSimpleAuth();

  useEffect(() => {
    fetchStats();
  }, [user]);

  const fetchStats = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('assets')
        .select('file_size, is_public, asset_category');

      if (error) throw error;

      const totalAssets = data?.length || 0;
      const totalSize = data?.reduce((sum, asset) => sum + asset.file_size, 0) || 0;
      const publicAssets = data?.filter(asset => asset.is_public).length || 0;
      
      const categoryCounts = data?.reduce((acc, asset) => {
        acc[asset.asset_category] = (acc[asset.asset_category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      setStats({
        totalAssets,
        totalSize,
        publicAssets,
        categoryCounts
      });
    } catch (error) {
      console.error('Error fetching asset stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const topCategory = Object.entries(stats.categoryCounts)
    .sort(([,a], [,b]) => b - a)[0];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-2/3"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
          <FileImage className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalAssets}</div>
          <p className="text-xs text-muted-foreground">
            Files in your library
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
          <HardDrive className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatFileSize(stats.totalSize)}</div>
          <p className="text-xs text-muted-foreground">
            Total file size
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Public Assets</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.publicAssets}</div>
          <p className="text-xs text-muted-foreground">
            Visible to all users
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Top Category</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold capitalize">
            {topCategory ? topCategory[0] : 'None'}
          </div>
          <p className="text-xs text-muted-foreground">
            {topCategory ? `${topCategory[1]} assets` : 'No assets yet'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}