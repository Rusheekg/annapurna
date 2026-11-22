export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/login', '/signup', '/privacy', '/terms'],
      disallow: ['/api', '/post', '/receive', '/volunteer', '/settings', '/welcome', '/impact', '/auth'],
    },
  };
}
