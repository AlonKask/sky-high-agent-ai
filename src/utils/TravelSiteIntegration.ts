interface FlightSearchParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  passengers: number;
  class: 'economy' | 'premium_economy' | 'business' | 'first';
}

interface FlightPrice {
  airline: string;
  price: number;
  currency: string;
  source: 'kayak' | 'skyscanner' | 'google_flights' | 'direct_airline';
  directBookingUrl?: string;
  lastUpdated: string;
  availability: boolean;
}

interface PriceComparisonResult {
  searchParams: FlightSearchParams;
  prices: FlightPrice[];
  bestDeal: FlightPrice;
  averagePrice: number;
  priceRange: { min: number; max: number };
  recommendations: string[];
}

export class TravelSiteIntegration {
  static async compareFlightPrices(params: FlightSearchParams): Promise<PriceComparisonResult> {
    const prices: FlightPrice[] = [];
    
    try {
      // Use Firecrawl to scrape travel sites
      const scrapingResults = await Promise.allSettled([
        this.scrapeKayak(params),
        this.scrapeSkyscanner(params),
        this.scrapeGoogleFlights(params)
      ]);

      scrapingResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          prices.push(...result.value);
        }
      });

      // Calculate best deal and statistics
      const validPrices = prices.filter(p => p.availability);
      const bestDeal = validPrices.reduce((best, current) => 
        current.price < best.price ? current : best
      );
      
      const priceValues = validPrices.map(p => p.price);
      const averagePrice = priceValues.reduce((sum, price) => sum + price, 0) / priceValues.length;
      const priceRange = {
        min: Math.min(...priceValues),
        max: Math.max(...priceValues)
      };

      return {
        searchParams: params,
        prices: validPrices,
        bestDeal,
        averagePrice,
        priceRange,
        recommendations: this.generateRecommendations(validPrices, params)
      };
    } catch (error) {
      console.error('Price comparison failed:', error);
      throw error;
    }
  }

  private static async scrapeKayak(params: FlightSearchParams): Promise<FlightPrice[]> {
    // Implementation would use Firecrawl to scrape Kayak
    // For now, return mock data structure
    return [];
  }

  private static async scrapeSkyscanner(params: FlightSearchParams): Promise<FlightPrice[]> {
    // Implementation would use Firecrawl to scrape Skyscanner
    return [];
  }

  private static async scrapeGoogleFlights(params: FlightSearchParams): Promise<FlightPrice[]> {
    // Implementation would use Google Flights API or scraping
    return [];
  }

  private static generateRecommendations(prices: FlightPrice[], params: FlightSearchParams): string[] {
    const recommendations: string[] = [];
    
    if (prices.length === 0) {
      return ['No prices found for this route'];
    }

    const sortedPrices = prices.sort((a, b) => a.price - b.price);
    const cheapest = sortedPrices[0];
    const mostExpensive = sortedPrices[sortedPrices.length - 1];
    
    recommendations.push(`Best deal: ${cheapest.airline} at $${cheapest.price}`);
    
    if (mostExpensive.price - cheapest.price > 200) {
      recommendations.push('Significant price variation - recommend booking soon');
    }
    
    const directBooking = prices.find(p => p.directBookingUrl);
    if (directBooking) {
      recommendations.push('Direct airline booking available for better service');
    }

    return recommendations;
  }
}