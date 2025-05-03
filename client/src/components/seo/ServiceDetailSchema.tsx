import React from 'react';
import StructuredData from './StructuredData';

/**
 * Componenta pentru generarea Schema.org pentru pagina de detalii service auto
 * Aceasta trebuie inclusă în pagina de profil a fiecărui service auto
 */
interface ServiceSchemaProps {
  name: string;
  description: string;
  companyName: string;
  companyUrl: string;
  image?: string;
  serviceTypes: string[];
  address?: {
    street: string;
    city: string;
    county: string;
    postalCode: string;
  };
  telephone?: string;
  email?: string;
  areasServed?: string[];
  priceRange?: string;
  yearInBusiness?: number;
  rating?: {
    value: number;
    count: number;
  };
}

const ServiceDetailSchema: React.FC<ServiceSchemaProps> = ({
  name,
  description,
  companyName,
  companyUrl,
  image,
  serviceTypes,
  address,
  telephone,
  email,
  areasServed,
  priceRange,
  yearInBusiness,
  rating
}) => {
  // Schema pentru LocalBusiness (service-ul auto)
  const businessSchema = {
    type: 'LocalBusiness' as const,
    data: {
      name: companyName,
      description,
      address: address ? {
        streetAddress: address.street,
        addressLocality: address.city,
        addressRegion: address.county,
        postalCode: address.postalCode,
        addressCountry: 'România'
      } : {
        streetAddress: '',
        addressLocality: '',
        addressRegion: '',
        postalCode: '',
        addressCountry: 'România'
      },
      telephone: telephone || '',
      email,
      url: companyUrl,
      image,
      priceRange: priceRange || '$$',
      ...(yearInBusiness && { foundingDate: new Date(new Date().getFullYear() - yearInBusiness, 0, 1).toISOString().split('T')[0] })
    }
  };

  // Schema pentru Service oferit
  const serviceSchema = {
    type: 'Service' as const,
    data: {
      name,
      description,
      provider: {
        name: companyName,
        url: companyUrl
      },
      serviceType: serviceTypes.join(', '),
      areaServed: areasServed
    }
  };

  return (
    <>
      <StructuredData schema={businessSchema} />
      <StructuredData schema={serviceSchema} />
      {rating && (
        <StructuredData 
          schema={{
            type: 'Review' as const,
            data: {
              author: 'Recenzii clienți CARVIZIO',
              datePublished: new Date().toISOString().split('T')[0],
              reviewBody: `Evaluarea generală a ${rating.count} clienți`,
              reviewRating: {
                ratingValue: rating.value,
                bestRating: 5
              },
              itemReviewed: {
                name: companyName,
                type: 'AutoRepair'
              }
            }
          }}
        />
      )}
    </>
  );
};

export default ServiceDetailSchema;