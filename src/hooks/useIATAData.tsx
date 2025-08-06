import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { debounce } from '@/utils/performanceMonitor';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';

// Types
export interface Airport {
  id: string;
  iata_code: string;
  icao_code?: string;
  name: string;
  city: string;
  country: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  created_at?: string;
}

export interface Airline {
  id: string;
  iata_code: string;
  icao_code?: string;
  name: string;
  country?: string;
  alliance?: string;
  logo_url?: string;
  created_at?: string;
  rbd_count?: number;
}

export interface BookingClass {
  id: string;
  booking_class_code: string;
  service_class: string;
  class_description?: string;
  booking_priority?: number;
  active?: boolean;
  airline_id: string;
  airline_name?: string;
  airline_iata?: string;
  created_at?: string;
  updated_at?: string;
}

// Airport hooks
export const useAirports = (searchTerm?: string, enabled = true) => {
  return useQuery({
    queryKey: ['airports', searchTerm],
    queryFn: async () => {
      if (searchTerm && searchTerm.trim() !== '') {
        const { data, error } = await supabase.rpc('search_airports', {
          search_term: searchTerm,
          page_limit: 1000,
          page_offset: 0
        });
        if (error) throw error;
        return data as Airport[];
      } else {
        const { data, error } = await supabase
          .from('airport_codes')
          .select('*')
          .order('name');
        if (error) throw error;
        return data as Airport[];
      }
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useAirportMutations = () => {
  const queryClient = useQueryClient();

  const createAirport = useMutation({
    mutationFn: async (airport: Omit<Airport, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('airport_codes')
        .insert([airport])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['airports'] });
      toast.success('Airport added successfully');
    },
    onError: (error) => {
      toast.error(`Failed to add airport: ${error.message}`);
    },
  });

  const updateAirport = useMutation({
    mutationFn: async ({ id, ...airport }: Partial<Airport> & { id: string }) => {
      const { data, error } = await supabase
        .from('airport_codes')
        .update(airport)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['airports'] });
      toast.success('Airport updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update airport: ${error.message}`);
    },
  });

  const deleteAirport = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('airport_codes')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['airports'] });
      toast.success('Airport deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete airport: ${error.message}`);
    },
  });

  return { createAirport, updateAirport, deleteAirport };
};

// Airline hooks with proper RBD relationship
export const useAirlines = (searchTerm?: string, enabled = true) => {
  return useQuery({
    queryKey: ['airlines', searchTerm],
    queryFn: async () => {
      if (searchTerm) {
        const { data, error } = await supabase.rpc('search_airlines', {
          search_term: searchTerm,
          page_limit: 1000,
          page_offset: 0
        });
        if (error) throw error;
        return data as Airline[];
      } else {
        // Use new function that properly handles the relationship
        const { data, error } = await supabase.rpc('search_airlines', {
          search_term: '',
          page_limit: 1000,
          page_offset: 0
        });
        if (error) throw error;
        return data as Airline[];
      }
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useAirlineMutations = () => {
  const queryClient = useQueryClient();

  const createAirline = useMutation({
    mutationFn: async (airline: Omit<Airline, 'id' | 'created_at' | 'rbd_count'>) => {
      const { data, error } = await supabase
        .from('airline_codes')
        .insert([airline])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['airlines'] });
      toast.success('Airline added successfully');
    },
    onError: (error) => {
      toast.error(`Failed to add airline: ${error.message}`);
    },
  });

  const updateAirline = useMutation({
    mutationFn: async ({ id, ...airline }: Partial<Airline> & { id: string }) => {
      const { data, error } = await supabase
        .from('airline_codes')
        .update(airline)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['airlines'] });
      toast.success('Airline updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update airline: ${error.message}`);
    },
  });

  const deleteAirline = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('airline_codes')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['airlines'] });
      toast.success('Airline deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete airline: ${error.message}`);
    },
  });

  return { createAirline, updateAirline, deleteAirline };
};

// Booking Class hooks
export const useBookingClasses = (searchTerm?: string, enabled = true) => {
  return useQuery({
    queryKey: ['booking-classes', searchTerm],
    queryFn: async () => {
      if (searchTerm) {
        const { data, error } = await supabase.rpc('search_booking_classes', {
          search_term: searchTerm,
          page_limit: 1000,
          page_offset: 0
        });
        if (error) throw error;
        return data as BookingClass[];
      } else {
        const { data, error } = await supabase
          .from('booking_classes')
          .select(`
            *,
            airline_codes!inner(name, iata_code)
          `)
          .order('booking_class_code');
        if (error) throw error;
        return data.map(bc => ({
          ...bc,
          airline_name: bc.airline_codes?.name,
          airline_iata: bc.airline_codes?.iata_code
        })) as BookingClass[];
      }
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useBookingClassMutations = () => {
  const queryClient = useQueryClient();

  const createBookingClass = useMutation({
    mutationFn: async (bookingClass: Omit<BookingClass, 'id' | 'created_at' | 'updated_at' | 'airline_name' | 'airline_iata'>) => {
      const { data, error } = await supabase
        .from('booking_classes')
        .insert([bookingClass])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-classes'] });
      toast.success('Booking class added successfully');
    },
    onError: (error) => {
      toast.error(`Failed to add booking class: ${error.message}`);
    },
  });

  const updateBookingClass = useMutation({
    mutationFn: async ({ id, airline_name, airline_iata, ...bookingClass }: Partial<BookingClass> & { id: string }) => {
      const { data, error } = await supabase
        .from('booking_classes')
        .update(bookingClass)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-classes'] });
      toast.success('Booking class updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update booking class: ${error.message}`);
    },
  });

  const deleteBookingClass = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('booking_classes')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-classes'] });
      toast.success('Booking class deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete booking class: ${error.message}`);
    },
  });

  return { createBookingClass, updateBookingClass, deleteBookingClass };
};

// Airline RBD hooks for the unified interface
export const useAirlineRBDs = (airlineId: string, enabled = true) => {
  return useQuery({
    queryKey: ['airline-rbds', airlineId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_airline_rbds', {
        airline_uuid: airlineId
      });
      if (error) throw error;
      return data;
    },
    enabled: enabled && !!airlineId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useAirlineRBDMutations = () => {
  const queryClient = useQueryClient();

  const createRBD = useMutation({
    mutationFn: async (rbd: {
      airline_id: string;
      booking_class_code: string;
      service_class: string;
      class_description?: string;
      booking_priority?: number;
      is_active?: boolean;
      effective_from?: string;
      effective_until?: string;
    }) => {
      const { data, error } = await supabase
        .from('airline_rbd_assignments')
        .insert([rbd])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['airline-rbds', variables.airline_id] });
      queryClient.invalidateQueries({ queryKey: ['airlines'] });
      toast.success('RBD assignment added successfully');
    },
    onError: (error) => {
      toast.error(`Failed to add RBD assignment: ${error.message}`);
    },
  });

  const updateRBD = useMutation({
    mutationFn: async ({ id, airline_id, ...rbd }: any) => {
      const { data, error } = await supabase
        .from('airline_rbd_assignments')
        .update(rbd)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['airline-rbds', variables.airline_id] });
      queryClient.invalidateQueries({ queryKey: ['airlines'] });
      toast.success('RBD assignment updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update RBD assignment: ${error.message}`);
    },
  });

  const deleteRBD = useMutation({
    mutationFn: async ({ id, airline_id }: { id: string; airline_id: string }) => {
      const { error } = await supabase
        .from('airline_rbd_assignments')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { airline_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['airline-rbds', data.airline_id] });
      queryClient.invalidateQueries({ queryKey: ['airlines'] });
      toast.success('RBD assignment deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete RBD assignment: ${error.message}`);
    },
  });

  return { createRBD, updateRBD, deleteRBD };
};

// Debounced search hook
export const useDebouncedSearch = (initialValue = '', delay = 300) => {
  const [debouncedValue, setDebouncedValue] = useState(initialValue);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(initialValue);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [initialValue, delay]);

  return { debouncedValue };
};