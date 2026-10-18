import type {NextConfig} from 'next';
const config: NextConfig = {output: process.env.CONTAINER_BUILD === 'true' ? 'standalone' : undefined, poweredByHeader: false, transpilePackages: ['@lifeflow/api-contracts']};
export default config;
