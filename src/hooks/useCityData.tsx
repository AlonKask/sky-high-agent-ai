import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CityWithAirports {
  city: string;
  country: string;
  airport_count: number;
}

export interface SimilarCity extends CityWithAirports {
  id: string;
  similarity_score: number;
}

export const useCityData = (searchTerm?: string) => {
  const queryClient = useQueryClient();

  // Get city suggestions for autocomplete
  const { data: citySuggestions, isLoading: isLoadingSuggestions } = useQuery({
    queryKey: ['city-suggestions', searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) return [];
      
      const { data, error } = await supabase.rpc('get_city_suggestions', {
        partial_name: searchTerm,
        suggestion_limit: 15
      });
      
      if (error) throw error;
      return data as CityWithAirports[];
    },
    enabled: Boolean(searchTerm && searchTerm.length >= 2),
    staleTime: 30 * 1000, // 30 seconds
  });

  // Get all cities with airport counts
  const { data: allCities, isLoading: isLoadingCities } = useQuery({
    queryKey: ['cities-with-airports'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_cities_with_airports');
      if (error) throw error;
      return data as CityWithAirports[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Find similar cities for duplicate detection
  const findSimilarCities = async (cityName: string): Promise<SimilarCity[] | null> => {
    if (!cityName || cityName.length < 2) return null;
    
    try {
      // First try with pg_trgm extension if available, fallback to basic search
      const { data, error } = await supabase
        .from('airport_codes')
        .select('id, city, country')
        .ilike('city', `%${cityName}%`)
        .neq('city', cityName);
        
      if (error) throw error;
      
      // Group by city+country and count airports
      const cityGroups: Record<string, SimilarCity> = {};
      
      data.forEach(airport => {
        const key = `${airport.city}-${airport.country}`;
        if (!cityGroups[key]) {
          cityGroups[key] = {
            id: airport.id,
            city: airport.city,
            country: airport.country,
            airport_count: 0,
            similarity_score: calculateSimilarity(cityName, airport.city)
          };
        }
        cityGroups[key].airport_count++;
      });

      return Object.values(cityGroups)
        .filter(city => city.similarity_score > 0.5)
        .sort((a, b) => b.similarity_score - a.similarity_score);
        
    } catch (error) {
      console.error('Error finding similar cities:', error);
      return null;
    }
  };

  // Simple similarity calculation (Levenshtein-based)
  const calculateSimilarity = (str1: string, str2: string): number => {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    
    if (s1 === s2) return 1;
    if (s1.includes(s2) || s2.includes(s1)) return 0.8;
    
    const distance = levenshteinDistance(s1, s2);
    const maxLength = Math.max(s1.length, s2.length);
    return (maxLength - distance) / maxLength;
  };

  const levenshteinDistance = (str1: string, str2: string): number => {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  };

  // Mutation for merging cities
  const mergeCitiesMutation = useMutation({
    mutationFn: async ({ 
      sourceCities, 
      targetCity, 
      targetCountry 
    }: { 
      sourceCities: { city: string; country: string }[], 
      targetCity: string, 
      targetCountry: string 
    }) => {
      const { data, error } = await supabase.rpc('merge_cities', {
        source_cities: sourceCities,
        target_city: targetCity,
        target_country: targetCountry
      });
      
      if (error) throw error;
      return data as number;
    },
    onSuccess: (updatedCount) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['airports'] });
      queryClient.invalidateQueries({ queryKey: ['cities-with-airports'] });
      queryClient.invalidateQueries({ queryKey: ['city-suggestions'] });
      
      toast.success(`Successfully merged ${updatedCount} airport records`);
    },
    onError: (error) => {
      console.error('City merge error:', error);
      toast.error('Failed to merge cities. Please try again.');
    },
  });

  return {
    // Data
    citySuggestions,
    allCities,
    
    // Loading states
    isLoadingSuggestions,
    isLoadingCities,
    isLoadingSimilar: false, // findSimilarCities is async function
    isMerging: mergeCitiesMutation.isPending,
    
    // Functions
    findSimilarCities,
    mergeCities: (sourceCities: { city: string; country: string }[], targetCity: string, targetCountry: string) =>
      mergeCitiesMutation.mutateAsync({ sourceCities, targetCity, targetCountry }),
  };
};