import type { ProcessResult } from "./process";
import type { PdfPageSize } from "./export-bus";

async function toDataUrl(blob: Blob): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Read failed"));
    reader.readAsDataURL(blob);
  });
}

/** jsPDF only embeds JPEG/PNG — anything else is re-encoded through a canvas. */
async function pdfImage(result: ProcessResult) {
  if (result.type === "image/jpeg" || result.type === "image/png") {
    return { data: await toDataUrl(result.blob), format: result.type === "image/jpeg" ? "JPEG" : "PNG" };
  }
  const bmp = await createImageBitmap(result.blob);
  const canvas = document.createElement("canvas");
  canvas.width = bmp.width;
  canvas.height = bmp.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(bmp, 0, 0);
  return { data: canvas.toDataURL("image/png"), format: "PNG" };
}

const paperSizes: Record<Exclude<PdfPageSize, "same">, [number, number]> = {
  a3: [297, 420],
  a4: [210, 297],
  a5: [148, 210],
};

function pageFor(result: ProcessResult, size: PdfPageSize) {
  if (size === "same") {
    return { unit: "px" as const, width: result.width, height: result.height };
  }
  const [short, long] = paperSizes[size];
  const landscape = result.width >= result.height;
  return {
    unit: "mm" as const,
    width: landscape ? long : short,
    height: landscape ? short : long,
  };
}

/** One centered, uncropped image per page, using either image dimensions or an ISO paper size. */
export async function downloadPdf(
  results: ProcessResult[],
  pageSize: PdfPageSize = "same",
  filename = "tinytools.pdf",
) {
  if (!results.length) return;
  const { jsPDF } = await import("jspdf");
  let doc: import("jspdf").jsPDF | null = null;

  for (const result of results) {
    const { data, format } = await pdfImage(result);
    const page = pageFor(result, pageSize);
    if (!doc) {
      doc = new jsPDF({
        unit: page.unit,
        format: [page.width, page.height],
        orientation: page.width >= page.height ? "landscape" : "portrait",
      });
    } else {
      doc.addPage(
        [page.width, page.height],
        page.width >= page.height ? "landscape" : "portrait",
      );
    }
    const scale = Math.min(page.width / result.width, page.height / result.height);
    const imageWidth = result.width * scale;
    const imageHeight = result.height * scale;
    doc.addImage(
      data,
      format,
      (page.width - imageWidth) / 2,
      (page.height - imageHeight) / 2,
      imageWidth,
      imageHeight,
    );
  }

  doc?.save(filename);
}
