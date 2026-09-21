import { NextResponse } from "next/server";
import path from "path";
import { pathToFileURL } from "url";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 12 * 1024 * 1024; // 12 MB

function publicPathForModels() {
  // Point at the package dist so onnx/wasm assets resolve on the server filesystem.
  const dist = path.join(process.cwd(), "node_modules", "@imgly", "background-removal-node", "dist");
  return `${pathToFileURL(dist).href}/`;
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing image file." }, { status: 400 });
    }

    if (!file.type.startsWith("image/") && !/\.(heic|heif)$/i.test(file.name)) {
      return NextResponse.json({ error: "Only image uploads are supported." }, { status: 415 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Image must be 12 MB or smaller." }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { removeBackground } = await import("@imgly/background-removal-node");

    const result = await removeBackground(buffer, {
      publicPath: publicPathForModels(),
      model: "medium",
      output: { format: "image/png", quality: 0.9 },
    });

    const bytes = new Uint8Array(await result.arrayBuffer());

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[remove-bg]", error);
    const message = error instanceof Error ? error.message : "Background removal failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
