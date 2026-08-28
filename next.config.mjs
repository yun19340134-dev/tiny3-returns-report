const isGitHubPages = process.env.GITHUB_PAGES === "true";
const githubPagesBasePath = "/tiny3-returns-report";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  poweredByHeader: false,
  trailingSlash: true,
  ...(isGitHubPages
    ? {
        basePath: githubPagesBasePath,
        assetPrefix: githubPagesBasePath
      }
    : {})
};

export default nextConfig;
