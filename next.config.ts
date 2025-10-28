import type { NextConfig } from "next";
import path from "path";

// Garante que o Turbopack reconheça este diretório como raiz e carregue .env.local daqui.
const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
