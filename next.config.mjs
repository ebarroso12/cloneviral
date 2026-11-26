/** @type {import('next').NextConfig} */
const nextConfig = { reactStrictMode: true, serverExternalPackages: ["pdf-lib"], experimental: { serverActions: { bodySizeLimit: "100mb" } } };
export default nextConfig;
