function envFirebase(nome) {
  return process.env[`NEXT_FIREBASE_${nome}`] || process.env[`NEXT_PUBLIC_FIREBASE_${nome}`] || "";
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_FIREBASE_API_KEY: envFirebase("API_KEY"),
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: envFirebase("AUTH_DOMAIN"),
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: envFirebase("PROJECT_ID"),
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: envFirebase("STORAGE_BUCKET"),
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: envFirebase("MESSAGING_SENDER_ID"),
    NEXT_PUBLIC_FIREBASE_APP_ID: envFirebase("APP_ID"),
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "base-uri 'self'",
              "frame-ancestors 'none'",
              "form-action 'self'",
              "object-src 'none'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://connect.facebook.net https://www.facebook.com https://va.vercel-scripts.com https://www.gstatic.com https://apis.google.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https://www.facebook.com https://www.google.com https://www.google.com.br",
              "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebase.com https://*.cloudfunctions.net https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com https://www.facebook.com https://connect.facebook.net https://vitals.vercel-insights.com https://va.vercel-scripts.com https://apis.google.com",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
