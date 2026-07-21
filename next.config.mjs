/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "50mb" },
    serverComponentsExternalPackages: ["bcryptjs", "@prisma/client", "prisma"],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push("bcryptjs");
    }
    return config;
  },
};

export default nextConfig;
