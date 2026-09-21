"use client";

import { Bookmark, Heart, MessageCircle, MoreHorizontal, Play, Repeat2, Send, ThumbsUp } from "lucide-react";
import type { SocialPlatform } from "@/lib/tinytools/catalog";

type Props = {
  src: string;
  platform: SocialPlatform;
  alt: string;
  handle?: string;
};

function Avatar() {
  return <span className="size-8 shrink-0 rounded-full bg-gradient-to-br from-brand to-brand/40" />;
}

/** Lightweight platform mockups so the export is judged in context, not in isolation. */
export function SocialMockup({ src, platform, alt, handle = "yourbrand" }: Props) {
  if (platform === "story") {
    return (
      <div className="flex justify-center">
        <div className="w-[248px] overflow-hidden rounded-[2rem] border-4 border-foreground/85 bg-foreground/95 shadow-lift">
          <div className="relative aspect-[9/16] bg-foreground">
            <img src={src} alt={alt} className="size-full object-cover" />
            <div className="absolute inset-x-3 top-3 space-y-2">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className={`h-0.5 flex-1 rounded-full ${i === 0 ? "bg-background" : "bg-background/40"}`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Avatar />
                <span className="text-xs font-medium text-background">{handle}</span>
                <span className="text-[11px] text-background/70">2h</span>
              </div>
            </div>
            <div className="absolute inset-x-3 bottom-3 flex items-center gap-2">
              <span className="flex-1 rounded-full border border-background/50 px-3 py-1.5 text-[11px] text-background/80">
                Send message
              </span>
              <Heart className="size-4 text-background" />
              <Send className="size-4 text-background" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (platform === "youtube") {
    return (
      <div className="mx-auto max-w-md space-y-3">
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="relative aspect-video bg-foreground/10">
            <img src={src} alt={alt} className="size-full object-cover" />
            <span className="num absolute right-2 bottom-2 rounded bg-foreground/80 px-1.5 py-0.5 text-[10px] font-medium text-background">
              12:04
            </span>
            <span className="absolute inset-0 m-auto flex size-10 items-center justify-center rounded-full bg-foreground/60">
              <Play className="size-4 fill-background text-background" />
            </span>
          </div>
        </div>
        <div className="flex gap-3">
          <Avatar />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">How we shipped this in one afternoon</p>
            <p className="num mt-0.5 text-xs text-muted-foreground">
              {handle} · 24K views · 3 days ago
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (platform === "x") {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-border bg-surface p-4">
        <div className="flex gap-3">
          <Avatar />
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-sm">
              <span className="font-semibold">Your Brand</span>{" "}
              <span className="text-muted-foreground">@{handle} · 1h</span>
            </p>
            <p className="text-sm">Shipping something small today. Preview below.</p>
            <div className="overflow-hidden rounded-2xl border border-border">
              <img src={src} alt={alt} className="aspect-video w-full object-cover" />
            </div>
            <div className="flex items-center gap-8 pt-1 text-muted-foreground">
              <MessageCircle className="size-4" />
              <Repeat2 className="size-4" />
              <Heart className="size-4" />
              <Bookmark className="size-4" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (platform === "linkedin") {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-border bg-surface">
        <div className="flex items-center gap-3 p-4">
          <Avatar />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">Your Brand</p>
            <p className="truncate text-xs text-muted-foreground">
              Product studio · 1,204 followers
            </p>
          </div>
          <MoreHorizontal className="size-4 text-muted-foreground" />
        </div>
        <p className="px-4 pb-3 text-sm">
          A quick look at what we shipped this week.
        </p>
        <img src={src} alt={alt} className="w-full object-cover" />
        <div className="flex items-center gap-6 border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <ThumbsUp className="size-4" /> Like
          </span>
          <span className="flex items-center gap-1.5">
            <MessageCircle className="size-4" /> Comment
          </span>
          <span className="flex items-center gap-1.5">
            <Send className="size-4" /> Send
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm rounded-xl border border-border bg-surface">
      <div className="flex items-center gap-3 p-3">
        <Avatar />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold">{handle}</p>
          <p className="truncate text-[11px] text-muted-foreground">Cape Town</p>
        </div>
        <MoreHorizontal className="size-4 text-muted-foreground" />
      </div>
      <img src={src} alt={alt} className="w-full object-cover" />
      <div className="space-y-2 p-3">
        <div className="flex items-center gap-4 text-foreground">
          <Heart className="size-5" />
          <MessageCircle className="size-5" />
          <Send className="size-5" />
          <Bookmark className="ml-auto size-5" />
        </div>
        <p className="num text-xs font-medium">1,428 likes</p>
        <p className="text-xs">
          <span className="font-semibold">{handle}</span> New drop, same day turnaround.
        </p>
      </div>
    </div>
  );
}
