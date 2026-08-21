import { Document, Packer, Paragraph } from 'docx';
import { PDFDocument, StandardFonts } from 'pdf-lib';

export const createPdfResume = async (name = 'Asha Student') => {
  const document = await PDFDocument.create();
  const page = document.addPage([595, 842]);
  const font = await document.embedFont(StandardFonts.Helvetica);
  page.drawText(
    `${name} Resume Skills JavaScript React Git Education Computer Science Projects Student Portal`,
    { font, size: 12, x: 50, y: 780 },
  );
  return Buffer.from(await document.save());
};

export const createDocxResume = async (name = 'Ravi Student') => {
  const document = new Document({
    sections: [
      {
        children: [
          new Paragraph(`${name} Resume`),
          new Paragraph('Skills'),
          new Paragraph('Node.js Express MongoDB REST Git'),
          new Paragraph('Education'),
          new Paragraph('Bachelor of Engineering in Computer Science'),
          new Paragraph('Projects'),
          new Paragraph('Built a placement preparation web application.'),
        ],
      },
    ],
  });

  return Packer.toBuffer(document);
};
