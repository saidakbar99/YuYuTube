import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

const config = [
  { ignores: [".next/**", "out/**", "node_modules/**", "public/sw.js"] },
  ...coreWebVitals,
  ...typescript,
  {
    // Thumbnails come straight from i.ytimg.com; the app is a static export with
    // image optimization off, so next/image would only add weight.
    rules: { "@next/next/no-img-element": "off" },
  },
];

export default config;
