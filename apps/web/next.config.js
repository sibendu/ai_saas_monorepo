const path = require('path')
require('../../scripts/load-root-env')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@saas/shared-types'],
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../..'),
}

module.exports = nextConfig
