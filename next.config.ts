import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Keep heavy onnx/wasm deps out of the Node server bundle; they run in the browser only.
  serverExternalPackages: ["@imgly/background-removal", "onnxruntime-web"],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      // Avoid bundling optional WebGPU entry that breaks some Next builds.
      "onnxruntime-web/webgpu": false,
    };
    return config;
  },
};

export default nextConfig;
