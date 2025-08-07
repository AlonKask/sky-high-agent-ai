// Configuration for external services
export const config = {
  google: {
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || "871203174190-t2f8sg44gh37nne80saenhajffitpu7n.apps.googleusercontent.com",
  },
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL || "https://ekrwjfdypqzequovmvjn.supabase.co",
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrcndqZmR5cHF6ZXF1b3ZtdmpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxMDA4MzEsImV4cCI6MjA2ODY3NjgzMX0.r2Y4sVUM_0ofU1G8QGDDqSR7-LatBkWXa8pWSwniXdE"
  }
};