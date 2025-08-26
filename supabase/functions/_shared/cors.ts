// Shared CORS configuration following Supabase recommendations
// https://supabase.com/docs/guides/functions/cors

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Handle CORS preflight requests
 * Call this for OPTIONS method requests
 */
export function handleCors(): Response {
  return new Response('ok', { headers: corsHeaders })
}

/**
 * Add CORS headers to a response
 */
export function withCors(response: Response): Response {
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}