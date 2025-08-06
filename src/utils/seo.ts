// SEO optimization utilities

interface MetaTagConfig {
  title?: string;
  description?: string;
  keywords?: string[];
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'profile';
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
}

export class SEOManager {
  private static defaultConfig: MetaTagConfig = {
    title: 'Travel Agent Pro - Business Class Travel Management',
    description: 'Professional travel management system for business class bookings, client management, and email integration.',
    keywords: ['travel', 'business class', 'booking', 'agent', 'management'],
    type: 'website',
    image: '/og-image.jpg'
  };

  static updateMetaTags(config: MetaTagConfig) {
    const fullConfig = { ...this.defaultConfig, ...config };
    
    // Update title
    if (fullConfig.title) {
      document.title = fullConfig.title;
      this.setMetaTag('property', 'og:title', fullConfig.title);
      this.setMetaTag('name', 'twitter:title', fullConfig.title);
    }

    // Update description
    if (fullConfig.description) {
      this.setMetaTag('name', 'description', fullConfig.description);
      this.setMetaTag('property', 'og:description', fullConfig.description);
      this.setMetaTag('name', 'twitter:description', fullConfig.description);
    }

    // Update keywords
    if (fullConfig.keywords && fullConfig.keywords.length > 0) {
      this.setMetaTag('name', 'keywords', fullConfig.keywords.join(', '));
    }

    // Update Open Graph tags
    if (fullConfig.image) {
      this.setMetaTag('property', 'og:image', fullConfig.image);
      this.setMetaTag('name', 'twitter:image', fullConfig.image);
    }

    if (fullConfig.url) {
      this.setMetaTag('property', 'og:url', fullConfig.url);
    }

    if (fullConfig.type) {
      this.setMetaTag('property', 'og:type', fullConfig.type);
    }

    // Update Twitter Card
    this.setMetaTag('name', 'twitter:card', 'summary_large_image');

    // Update article-specific tags
    if (fullConfig.author) {
      this.setMetaTag('name', 'author', fullConfig.author);
    }

    if (fullConfig.publishedTime) {
      this.setMetaTag('property', 'article:published_time', fullConfig.publishedTime);
    }

    if (fullConfig.modifiedTime) {
      this.setMetaTag('property', 'article:modified_time', fullConfig.modifiedTime);
    }
  }

  private static setMetaTag(attribute: string, value: string, content: string) {
    let element = document.querySelector(`meta[${attribute}="${value}"]`) as HTMLMetaElement;
    
    if (!element) {
      element = document.createElement('meta');
      element.setAttribute(attribute, value);
      document.head.appendChild(element);
    }
    
    element.content = content;
  }

  // Page-specific SEO configurations
  static configurePage(page: string, data?: any) {
    const configs: Record<string, MetaTagConfig> = {
      home: {
        title: 'Travel Agent Pro - Business Class Travel Management',
        description: 'Professional travel management system for business class bookings and client management.',
        keywords: ['travel agent', 'business class', 'booking system', 'travel management']
      },
      clients: {
        title: 'Client Management - Travel Agent Pro',
        description: 'Manage your travel clients with comprehensive profiles, booking history, and communication tracking.',
        keywords: ['client management', 'travel clients', 'customer profiles']
      },
      bookings: {
        title: 'Bookings Dashboard - Travel Agent Pro',
        description: 'View and manage all your travel bookings in one centralized dashboard.',
        keywords: ['travel bookings', 'booking management', 'travel dashboard']
      },
      requests: {
        title: 'Travel Requests - Travel Agent Pro',
        description: 'Handle travel requests from clients with automated quoting and booking capabilities.',
        keywords: ['travel requests', 'quote management', 'booking requests']
      },
      analytics: {
        title: 'Analytics & Reports - Travel Agent Pro',
        description: 'Comprehensive analytics and reporting for your travel business performance.',
        keywords: ['travel analytics', 'business reports', 'performance metrics']
      }
    };

    const config = configs[page];
    if (config) {
      // Add current URL
      config.url = window.location.href;
      
      // Add dynamic data if available
      if (data?.title) {
        config.title = `${data.title} - Travel Agent Pro`;
      }
      
      if (data?.description) {
        config.description = data.description;
      }

      this.updateMetaTags(config);
    }
  }

  // Generate structured data for better SEO
  static addStructuredData(type: string, data: any) {
    const existingScript = document.querySelector('script[type="application/ld+json"]');
    if (existingScript) {
      existingScript.remove();
    }

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    
    let structuredData;
    
    switch (type) {
      case 'organization':
        structuredData = {
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "Travel Agent Pro",
          "description": "Professional travel management system for business class travel",
          "url": window.location.origin,
          ...data
        };
        break;
      
      case 'softwareApplication':
        structuredData = {
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "Travel Agent Pro",
          "applicationCategory": "BusinessApplication",
          "operatingSystem": "Web",
          "description": "Travel management system for professional travel agents",
          ...data
        };
        break;
      
      default:
        structuredData = {
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": "Travel Agent Pro",
          "url": window.location.origin,
          ...data
        };
    }

    script.textContent = JSON.stringify(structuredData);
    document.head.appendChild(script);
  }
}