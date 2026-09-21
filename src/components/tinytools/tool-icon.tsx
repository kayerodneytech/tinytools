"use client";

import {
  Crop,
  FileImage,
  Gauge,
  ImageMinus,
  Maximize2,
  Paintbrush,
  RefreshCw,
  ScanLine,
  Signature,
  Sparkles,
  Type,
  type LucideIcon,
} from "lucide-react";
import type { ToolId, SocialPlatform } from "@/lib/tinytools/catalog";

const toolIcons: Record<ToolId, LucideIcon> = {
  crop: Crop,
  rotate: RefreshCw,
  resize: Maximize2,
  removebg: ImageMinus,
  adjust: Sparkles,
  watermark: Signature,
  compress: Gauge,
  convert: FileImage,
  metadata: ScanLine,
  rename: Type,
};

export function ToolIcon({ id, className = "size-3.5" }: { id: ToolId; className?: string }) {
  const Icon = toolIcons[id] ?? Paintbrush;
  return <Icon className={className} aria-hidden="true" />;
}

export function PlatformIcon({
  platform,
  className = "size-4",
}: {
  platform: SocialPlatform;
  className?: string;
}) {
  if (platform === "youtube") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
        <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.3 3.6-6.3 3.6Z" />
      </svg>
    );
  }
  if (platform === "linkedin") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
        <path d="M5.4 7.4H1V21h4.4V7.4ZM3.2 1A2.6 2.6 0 1 0 3.2 6a2.6 2.6 0 0 0 0-5ZM21 13.2c0-4.1-2.2-6.1-5.1-6.1a5 5 0 0 0-4.5 2.5V7.4H7V21h4.4v-6.7c0-1.8.3-3.5 2.5-3.5 2.1 0 2.2 2 2.2 3.6V21h4.4l.5-7.8Z" />
      </svg>
    );
  }
  if (platform === "x") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
        <path d="M18.9 2H22l-6.8 7.8L23.2 22H17l-4.9-6.4L6.5 22H3.4l7.2-8.2L2.8 2h6.4l4.4 5.8L18.9 2Zm-1.1 17.9h1.7L8.3 4H6.5l11.3 15.9Z" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
