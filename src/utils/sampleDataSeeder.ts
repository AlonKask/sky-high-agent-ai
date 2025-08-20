import { supabase } from "@/integrations/supabase/client";

export const seedSampleData = async (userId: string) => {
  try {
    console.log('Seeding sample data for user:', userId);

    // Create sample clients
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .insert([
        {
          user_id: userId,
          first_name: 'Robert',
          last_name: 'Johnson',
          email: 'robert.johnson@acme.com',
          phone: '+1-555-0101',
          company: 'Acme Corp',
          preferred_class: 'business',
          total_bookings: 3,
          total_spent: 15000.00,
          last_trip_date: '2024-07-15',
          client_type: 'return'
        },
        {
          user_id: userId,
          first_name: 'Emily',
          last_name: 'Davis',
          email: 'emily.davis@tech.com',
          phone: '+1-555-0102',
          company: 'TechCorp',
          preferred_class: 'first',
          total_bookings: 1,
          total_spent: 8500.00,
          last_trip_date: '2024-06-20',
          client_type: 'return'
        },
        {
          user_id: userId,
          first_name: 'Michael',
          last_name: 'Brown',
          email: 'michael.brown@startup.io',
          phone: '+1-555-0103',
          company: 'Startup Inc',
          preferred_class: 'business',
          total_bookings: 0,
          total_spent: 0,
          client_type: 'new'
        }
      ])
      .select();

    if (clientsError) {
      console.error('Error creating clients:', clientsError);
      return false;
    }

    if (!clients || clients.length === 0) {
      console.error('No clients were created');
      return false;
    }

    // Create sample requests one by one to handle potential schema differences
    const requests = [];
    
    const request1 = await supabase
      .from('requests')
      .insert({
        user_id: userId,
        client_id: clients[0].id,
        request_type: 'flight',
        origin: 'JFK',
        destination: 'LHR',
        departure_date: '2024-09-15',
        return_date: '2024-09-22',
        passengers: 2,
        class_preference: 'business',
        status: 'quoted',
        priority: 'high',
        assignment_status: 'assigned',
        assigned_to: userId
      })
      .select()
      .single();

    if (request1.error) {
      console.error('Error creating request 1:', request1.error);
      return false;
    }
    requests.push(request1.data);

    const request2 = await supabase
      .from('requests')
      .insert({
        user_id: userId,
        client_id: clients[1].id,
        request_type: 'flight',
        origin: 'LAX',
        destination: 'NRT',
        departure_date: '2024-10-01',
        return_date: '2024-10-10',
        passengers: 1,
        class_preference: 'first',
        status: 'confirmed',
        priority: 'medium',
        assignment_status: 'assigned',
        assigned_to: userId
      })
      .select()
      .single();

    if (request2.error) {
      console.error('Error creating request 2:', request2.error);
      return false;
    }
    requests.push(request2.data);

    const request3 = await supabase
      .from('requests')
      .insert({
        user_id: userId,
        client_id: clients[2].id,
        request_type: 'flight',
        origin: 'ORD',
        destination: 'FRA',
        departure_date: '2024-09-25',
        return_date: '2024-10-02',
        passengers: 1,
        class_preference: 'business',
        status: 'pending',
        priority: 'medium',
        assignment_status: 'available'
      })
      .select()
      .single();

    if (request3.error) {
      console.error('Error creating request 3:', request3.error);
      return false;
    }
    requests.push(request3.data);

    console.log('Sample data seeded successfully:', {
      clients: clients.length,
      requests: requests.length
    });

    return true;
  } catch (error) {
    console.error('Error in seedSampleData:', error);
    return false;
  }
};