import "server-only";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";

const NPF_BLUE = "#0a2240";
const NPF_GOLD = "#ffd700";
const NPF_GREEN = "#006b3f";
const INK = "#0a2240";
const MUTED = "#5b6b7f";

export type DutyCardData = {
  assignmentId: string;
  officerName: string;
  officerRank: string;
  officerServiceNo: string;
  dutyRole: string | null;
  status: string;
  pollingUnitName: string;
  pollingUnitCode: string;
  ward: string | null;
  lgaName: string;
  stateName: string;
  generatedAt: Date;
};

function field(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  label: string,
  value: string
) {
  doc.font("Helvetica").fontSize(7.5).fillColor(MUTED).text(label.toUpperCase(), x, y, {
    width,
    characterSpacing: 0.5,
  });
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor(INK)
    .text(value || "—", x, y + 11, { width });
}

export async function generateDutyCardPdf(data: DutyCardData): Promise<Buffer> {
  const qrDataUrl = await QRCode.toDataURL(
    `ESDMS|${data.assignmentId}|${data.officerServiceNo}|${data.pollingUnitCode}`,
    { margin: 0, width: 200 }
  );
  const qrBuffer = Buffer.from(qrDataUrl.split(",")[1], "base64");

  const doc = new PDFDocument({ size: [320, 500], margin: 0 });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  const done = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  const pageWidth = 320;

  // Header band
  doc.rect(0, 0, pageWidth, 90).fill(NPF_BLUE);
  doc.rect(0, 87, pageWidth, 3).fill(NPF_GOLD);

  doc
    .circle(30, 32, 16)
    .lineWidth(1.5)
    .strokeColor(NPF_GOLD)
    .stroke();
  doc.font("Helvetica-Bold").fontSize(9).fillColor(NPF_GOLD).text("NPF", 18, 27, { width: 24, align: "center" });

  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor("#ffffff")
    .text("NIGERIA POLICE FORCE", 54, 18, { width: pageWidth - 70 });
  doc
    .font("Helvetica")
    .fontSize(8.5)
    .fillColor("#c9d4e0")
    .text("Election Security Duty Card", 54, 34, { width: pageWidth - 70 });

  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor(NPF_GOLD)
    .text(data.status, 20, 60, { width: pageWidth - 40 });

  let y = 112;
  const margin = 20;
  const colWidth = pageWidth - margin * 2;

  field(doc, margin, y, colWidth, "Officer name", data.officerName);
  y += 34;
  field(doc, margin, y, colWidth / 2 - 6, "Rank", data.officerRank);
  field(doc, margin + colWidth / 2 + 6, y, colWidth / 2 - 6, "Service No.", data.officerServiceNo);
  y += 34;
  field(doc, margin, y, colWidth, "Duty role", data.dutyRole ?? "Security Officer");

  y += 40;
  doc.moveTo(margin, y).lineTo(pageWidth - margin, y).lineWidth(0.5).strokeColor("#dde4ec").stroke();
  y += 16;

  doc.font("Helvetica-Bold").fontSize(9).fillColor(NPF_GREEN).text("POLLING UNIT", margin, y);
  y += 16;
  field(doc, margin, y, colWidth, "Name", data.pollingUnitName);
  y += 34;
  field(doc, margin, y, colWidth / 2 - 6, "INEC Code", data.pollingUnitCode);
  field(doc, margin + colWidth / 2 + 6, y, colWidth / 2 - 6, "Ward", data.ward ?? "—");
  y += 34;
  field(doc, margin, y, colWidth, "LGA / State", `${data.lgaName}, ${data.stateName}`);

  y += 44;
  const qrSize = 90;
  const qrX = (pageWidth - qrSize) / 2;
  doc.image(qrBuffer, qrX, y, { width: qrSize, height: qrSize });
  y += qrSize + 10;

  doc
    .font("Helvetica")
    .fontSize(7)
    .fillColor(MUTED)
    .text(
      `Generated ${data.generatedAt.toISOString().slice(0, 10)} · Authorized personnel only`,
      margin,
      y,
      { width: colWidth, align: "center" }
    );

  doc.end();
  return done;
}
