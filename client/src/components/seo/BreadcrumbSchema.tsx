import React from 'react';
import StructuredData from './StructuredData';

/**
 * Componentă pentru generarea unei scheme de breadcrumb pentru optimizare SEO
 * Breadcrumbs ajută la înțelegerea ierarhiei site-ului de către motoarele de căutare
 * și îmbunătățesc afișarea rezultatelor în paginile de căutare
 */
interface BreadcrumbSchemaProps {
  items: Array<{
    name: string;
    url: string;
  }>;
}

const BreadcrumbSchema: React.FC<BreadcrumbSchemaProps> = ({ items }) => {
  const breadcrumbSchema = {
    type: 'Breadcrumb' as const,
    data: {
      items
    }
  };

  return <StructuredData schema={breadcrumbSchema} />;
};

export default BreadcrumbSchema;