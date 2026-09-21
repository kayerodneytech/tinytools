export const siteConfig = {
  name: "TinyTools",
  shortName: "TinyTools",
  tagline: "Compress, convert & resize images in seconds",
  description:
    "Free image tools by PixelPyre Technologies. Compress JPEG/PNG/AVIF, convert formats, resize, crop, rotate, remove backgrounds, watermark, strip EXIF, and batch rename — mostly in your browser, no account required.",
  url: process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://tinytools.pixelpyre-tech.co.zw",
  locale: "en_US",
  creator: {
    name: "PixelPyre Technologies",
    url: "https://pixelpyre-tech.co.zw",
    logoLight: "/ppt_logo_light.png",
    logoDark: "/ppt_logo_dark.png",
  },
  keywords: [
    "image compressor",
    "compress images online",
    "convert image format",
    "JPEG to PNG",
    "PNG to AVIF",
    "resize images",
    "crop images online",
    "remove background",
    "background remover",
    "image watermark",
    "strip EXIF metadata",
    "batch rename images",
    "HEIC converter",
    "local image editor",
    "private image tools",
    "browser image compressor",
    "no upload image tools",
    "social media image resize",
    "Instagram crop",
    "YouTube thumbnail size",
    "TinyTools",
    "PixelPyre",
    "PixelPyre Technologies",
  ],
} as const;

export const absoluteUrl = (path = "/") => {
  const base = siteConfig.url;
  if (!path || path === "/") return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
};

export const defaultOgImage = {
  url: "/site-icon.png",
  width: 512,
  height: 512,
  alt: "TinyTools by PixelPyre Technologies — image utilities",
} as const;
