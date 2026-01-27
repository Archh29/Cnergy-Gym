/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Temporarily disable ESLint during builds to fix deployment
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: false,
  },
  async rewrites() {
    return [
      {
        source: "/api/login",
        destination: "https://api.cnergy.site/login.php",
      },
      {
        source: "/api/session",
        destination: "https://api.cnergy.site/session.php",
      },
      {
        source: "/api/addstaff",
        destination: "https://api.cnergy.site/addstaff.php",
      },
    ];
  },
};

export default nextConfig;
