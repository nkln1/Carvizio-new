import React from 'react';

// Tipuri de date pentru Schema.org
interface LocalBusinessSchema {
  name: string;
  description: string;
  address: {
    streetAddress: string;
    addressLocality: string;
    addressRegion: string;
    postalCode: string;
    addressCountry: string;
  };
  telephone: string;
  email?: string;
  url: string;
  image?: string;
  priceRange?: string;
  openingHours?: string[];
  geo?: {
    latitude: number;
    longitude: number;
  };
}

interface ServiceSchema {
  name: string;
  description: string;
  provider: {
    name: string;
    url: string;
  };
  serviceType: string;
  areaServed?: string[];
  offers?: {
    price?: number;
    priceCurrency?: string;
    description?: string;
  };
}

interface ReviewSchema {
  author: string;
  datePublished: string;
  reviewBody: string;
  reviewRating: {
    ratingValue: number;
    bestRating: number;
  };
  itemReviewed: {
    name: string;
    type: string;
  };
}

interface FAQSchema {
  questions: {
    question: string;
    answer: string;
  }[];
}

interface BreadcrumbSchema {
  items: {
    name: string;
    url: string;
  }[];
}

interface OrganizationSchema {
  name: string;
  url: string;
  logo: string;
  description: string;
  foundingDate?: string;
}

// Definirea tipului pentru pagini tip Document (Termeni și Condiții, Politică Confidențialitate)
interface DocumentSchema {
  name: string;
  description: string;
  datePublished: string;
  dateModified: string;
  publisher: {
    name: string;
    logo?: string;
  };
  inLanguage?: string;
}

// Definirea tipului pentru pagini de contact
interface ContactPageSchema {
  name: string;
  description: string;
  contactPoint: {
    telephone: string;
    email: string;
    contactType: string;
  };
  url: string;
}

type SchemaType = 
  | { type: 'LocalBusiness'; data: LocalBusinessSchema }
  | { type: 'Service'; data: ServiceSchema }
  | { type: 'Review'; data: ReviewSchema }
  | { type: 'FAQ'; data: FAQSchema }
  | { type: 'Breadcrumb'; data: BreadcrumbSchema }
  | { type: 'Organization'; data: OrganizationSchema }
  | { type: 'Document'; data: DocumentSchema }
  | { type: 'ContactPage'; data: ContactPageSchema };

interface StructuredDataProps {
  schema: SchemaType;
}

/**
 * Componentă pentru adăugarea datelor structurate Schema.org
 * Aceasta îmbunătățește SEO prin facilitarea înțelegerii conținutului de către motoarele de căutare
 */
const StructuredData: React.FC<StructuredDataProps> = ({ schema }) => {
  let structuredData: Record<string, any> = {};

  switch (schema.type) {
    case 'LocalBusiness':
      structuredData = {
        '@context': 'https://schema.org',
        '@type': 'AutoRepair',
        ...schema.data,
        address: {
          '@type': 'PostalAddress',
          ...schema.data.address
        },
        geo: schema.data.geo ? {
          '@type': 'GeoCoordinates',
          latitude: schema.data.geo.latitude,
          longitude: schema.data.geo.longitude
        } : undefined
      };
      break;
    
    case 'Service':
      structuredData = {
        '@context': 'https://schema.org',
        '@type': 'Service',
        ...schema.data,
        provider: {
          '@type': 'Organization',
          ...schema.data.provider
        },
        offers: schema.data.offers ? {
          '@type': 'Offer',
          ...schema.data.offers
        } : undefined
      };
      break;
    
    case 'Review':
      structuredData = {
        '@context': 'https://schema.org',
        '@type': 'Review',
        author: {
          '@type': 'Person',
          name: schema.data.author
        },
        datePublished: schema.data.datePublished,
        reviewBody: schema.data.reviewBody,
        reviewRating: {
          '@type': 'Rating',
          ...schema.data.reviewRating
        },
        itemReviewed: {
          '@type': schema.data.itemReviewed.type,
          name: schema.data.itemReviewed.name
        }
      };
      break;
    
    case 'FAQ':
      structuredData = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: schema.data.questions.map(q => ({
          '@type': 'Question',
          name: q.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: q.answer
          }
        }))
      };
      break;
    
    case 'Breadcrumb':
      structuredData = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: schema.data.items.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.name,
          item: item.url
        }))
      };
      break;
      
    case 'Organization':
      structuredData = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        ...schema.data,
        logo: {
          '@type': 'ImageObject',
          url: schema.data.logo
        }
      };
      break;
      
    case 'Document':
      structuredData = {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: schema.data.name,
        description: schema.data.description,
        datePublished: schema.data.datePublished,
        dateModified: schema.data.dateModified,
        publisher: {
          '@type': 'Organization',
          name: schema.data.publisher.name,
          logo: schema.data.publisher.logo ? {
            '@type': 'ImageObject',
            url: schema.data.publisher.logo
          } : undefined
        },
        inLanguage: schema.data.inLanguage || 'ro'
      };
      break;
      
    case 'ContactPage':
      structuredData = {
        '@context': 'https://schema.org',
        '@type': 'ContactPage',
        name: schema.data.name,
        description: schema.data.description,
        url: schema.data.url,
        contactPoint: {
          '@type': 'ContactPoint',
          ...schema.data.contactPoint
        }
      };
      break;
  }

  return (
    <script 
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
};

export default StructuredData;