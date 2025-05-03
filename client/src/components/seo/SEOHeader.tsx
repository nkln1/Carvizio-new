import React from 'react';
import { Helmet } from 'react-helmet';
import StructuredData from './StructuredData';

interface SEOHeaderProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: 'website' | 'article';
  structuredData?: any;
}

/**
 * Componentă pentru optimizarea SEO în toate paginile site-ului
 * Adaugă toate meta tag-urile necesare și date structurate
 */
const SEOHeader: React.FC<SEOHeaderProps> = ({
  title = 'Auto Service App - Platformă pentru conectarea service-urilor auto cu clienții',
  description = 'Platformă care facilitează comunicarea între service-urile auto și clienți, permitând solicitări de service, oferte personalizate și programări online.',
  keywords = 'service auto, reparații auto, întreținere auto, oferte service, programare service auto, România',
  canonicalUrl = 'https://auto-service-app.ro/',
  ogImage = '/og-image.jpg',
  ogType = 'website',
  structuredData,
}) => {
  return (
    <Helmet>
      {/* Title și meta tags de bază */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      
      {/* Link-uri canonice */}
      <link rel="canonical" href={canonicalUrl} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      
      {/* Date structurate pentru îmbunătățirea rezultatelor în motoarele de căutare */}
      {structuredData && <StructuredData schema={structuredData} />}
    </Helmet>
  );
};

export default SEOHeader;