// Template variable replacement utility for email templates

interface TemplateVariables {
  CLIENT_NAME?: string;
  AGENT_NAME?: string;
  AGENT_EMAIL?: string;
  AGENT_PHONE?: string;
  ROUTE?: string;
  DEPARTURE_DATE?: string;
  RETURN_DATE?: string;
  PASSENGER_COUNT?: string;
  TOTAL_PRICE?: string;
  BOOKING_REF?: string;
  PNR?: string;
  FLIGHT_DETAILS?: string;
  AIRLINE_1?: string;
  AIRLINE_2?: string;
  AIRLINE_3?: string;
  PRICE_1?: string;
  PRICE_2?: string;
  PRICE_3?: string;
  FLIGHT_DETAILS_1?: string;
  FLIGHT_DETAILS_2?: string;
  FLIGHT_DETAILS_3?: string;
  HIGHLIGHTS_1?: string;
  HIGHLIGHTS_2?: string;
  HIGHLIGHTS_3?: string;
  RECOMMENDED_OPTION?: string;
  RECOMMENDATION_REASON?: string;
  ORIGINAL_FLIGHT?: string;
  UPDATE_REASON?: string;
  ACTION_REQUIRED?: string;
  AVAILABLE_OPTIONS?: string;
  DESTINATION?: string;
  TRAVEL_DATES?: string;
  AIRLINES?: string;
  [key: string]: string | undefined;
}

/**
 * Replace template variables in email content with actual values
 */
export const replaceTemplateVariables = (
  content: string,
  variables: TemplateVariables
): string => {
  let processedContent = content;

  // Replace each variable with its value
  Object.entries(variables).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processedContent = processedContent.replace(regex, value);
    }
  });

  return processedContent;
};

/**
 * Extract all variables used in a template
 */
export const extractTemplateVariables = (content: string): string[] => {
  const variableRegex = /{{([^}]+)}}/g;
  const matches = [];
  let match;
  
  while ((match = variableRegex.exec(content)) !== null) {
    matches.push(match[1]);
  }
  
  return [...new Set(matches)]; // Remove duplicates
};

/**
 * Get default variable values for common template variables
 */
export const getDefaultVariables = (
  userProfile?: any,
  clientData?: any,
  bookingData?: any
): TemplateVariables => {
  return {
    // Agent information
    AGENT_NAME: userProfile?.full_name || userProfile?.first_name || '[Agent Name]',
    AGENT_EMAIL: userProfile?.email || '[Agent Email]',
    AGENT_PHONE: userProfile?.phone || '[Agent Phone]',
    
    // Client information  
    CLIENT_NAME: clientData?.first_name 
      ? `${clientData.first_name} ${clientData.last_name || ''}`.trim()
      : '[Client Name]',
    
    // Booking information
    BOOKING_REF: bookingData?.booking_reference || '[Booking Reference]',
    PNR: bookingData?.pnr || '[PNR]',
    ROUTE: bookingData?.route || '[Route]',
    DEPARTURE_DATE: bookingData?.departure_date || '[Departure Date]',
    RETURN_DATE: bookingData?.return_date || '[Return Date]',
    PASSENGER_COUNT: bookingData?.passengers?.toString() || '1',
    TOTAL_PRICE: bookingData?.total_price 
      ? `$${bookingData.total_price.toLocaleString()}`
      : '[Total Price]',
    
    // Flight details
    FLIGHT_DETAILS: bookingData?.flight_details || '[Flight Details]',
    AIRLINES: bookingData?.airline || '[Airlines]',
    
    // Generic placeholders
    DESTINATION: '[Destination]',
    TRAVEL_DATES: '[Travel Dates]',
    AIRLINE_1: '[Airline Option 1]',
    AIRLINE_2: '[Airline Option 2]',
    AIRLINE_3: '[Airline Option 3]',
    PRICE_1: '[Price 1]',
    PRICE_2: '[Price 2]',
    PRICE_3: '[Price 3]',
    FLIGHT_DETAILS_1: '[Flight Details 1]',
    FLIGHT_DETAILS_2: '[Flight Details 2]',
    FLIGHT_DETAILS_3: '[Flight Details 3]',
    HIGHLIGHTS_1: '[Highlights 1]',
    HIGHLIGHTS_2: '[Highlights 2]',
    HIGHLIGHTS_3: '[Highlights 3]',
    RECOMMENDED_OPTION: '[Recommended Option]',
    RECOMMENDATION_REASON: '[Recommendation Reason]',
    ORIGINAL_FLIGHT: '[Original Flight]',
    UPDATE_REASON: '[Update Reason]',
    ACTION_REQUIRED: '[Action Required]',
    AVAILABLE_OPTIONS: '[Available Options]',
  };
};

/**
 * Validate that all required variables are provided
 */
export const validateTemplateVariables = (
  content: string,
  variables: TemplateVariables
): { isValid: boolean; missingVariables: string[] } => {
  const requiredVariables = extractTemplateVariables(content);
  const missingVariables = requiredVariables.filter(
    varName => !variables[varName] || variables[varName] === `[${varName}]`
  );
  
  return {
    isValid: missingVariables.length === 0,
    missingVariables
  };
};