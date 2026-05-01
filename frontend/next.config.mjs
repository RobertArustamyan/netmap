/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for the Docker multi-stage build: emits a self-contained server
  // bundle in .next/standalone that the runner stage copies into the image.
  output: "standalone",

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};

export default nextConfig;
