import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://horentals.com';
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/properties', '/about', '/privacy', '/terms', '/landlord-registration'],
      disallow: ['/admin', '/login', '/register', '/api/', '/graphql'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
