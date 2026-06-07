import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sta dev-assets toe vanaf andere hosts (telefoon op LAN tijdens lokaal testen)
  allowedDevOrigins: ['192.168.129.84', '*.local'],
};

export default nextConfig;
