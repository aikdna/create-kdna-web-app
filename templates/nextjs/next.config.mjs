const nextConfig = {
  // KDNA Core loads packaged runtime schemas with Node.js file APIs. Keep it
  // outside the Turbopack server bundle so App Router production builds use
  // the package exactly as they do at runtime.
  serverExternalPackages: ['@aikdna/kdna-core'],
}

export default nextConfig
