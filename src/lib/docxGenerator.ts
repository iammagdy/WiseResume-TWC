import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Packer,
  BorderStyle,
  Tab,
  TabStopType,
  TabStopPosition,
} from 'docx';
import { ResumeData } from '@/types/resume';
import { downloadFile } from '@/lib/downloadUtils';

/**
 * Generates an ATS-friendly DOCX from resume data and triggers download.
 */
export async function generateAndDownloadDOCX(resume: ResumeData): Promise<boolean> {
  const doc = buildDocument(resume);
  const blob = await Packer.toBlob(doc);
  const baseName = resume.contactInfo.fullName?.replace(/\s+/g, '_') || 'Resume';
  const result = await downloadFile({
    blob,
    fileName: `${baseName}_Resume.docx`,
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  return result.success;
}

function buildDocument(resume: ResumeData): Document {
  const sections: Paragraph[] = [];

  // Contact header
  sections.push(...buildContactSection(resume.contactInfo));

  // Summary
  if (resume.summary) {
    sections.push(sectionHeading('PROFESSIONAL SUMMARY'));
    sections.push(new Paragraph({ children: [new TextRun({ text: resume.summary, size: 22 })], spacing: { after: 200 } }));
  }

  // Experience
  if (resume.experience.length > 0) {
    sections.push(sectionHeading('EXPERIENCE'));
    for (const exp of resume.experience) {
      sections.push(new Paragraph({
        children: [
          new TextRun({ text: exp.position, bold: true, size: 22 }),
          new TextRun({ text: ` — ${exp.company}`, size: 22 }),
        ],
        spacing: { before: 120 },
      }));
      sections.push(new Paragraph({
        children: [
          new TextRun({ text: `${exp.startDate} – ${exp.current ? 'Present' : exp.endDate}`, italics: true, size: 20, color: '666666' }),
        ],
        spacing: { after: 80 },
      }));
      if (exp.description) {
        sections.push(new Paragraph({ children: [new TextRun({ text: exp.description, size: 22 })], spacing: { after: 60 } }));
      }
      for (const achievement of exp.achievements) {
        sections.push(new Paragraph({
          children: [new TextRun({ text: achievement, size: 22 })],
          bullet: { level: 0 },
          spacing: { after: 40 },
        }));
      }
    }
  }

  // Education
  if (resume.education.length > 0) {
    sections.push(sectionHeading('EDUCATION'));
    for (const edu of resume.education) {
      sections.push(new Paragraph({
        children: [
          new TextRun({ text: `${edu.degree} in ${edu.field}`, bold: true, size: 22 }),
          new TextRun({ text: ` — ${edu.institution}`, size: 22 }),
        ],
        spacing: { before: 120 },
      }));
      sections.push(new Paragraph({
        children: [
          new TextRun({ text: `${edu.startDate} – ${edu.endDate}`, italics: true, size: 20, color: '666666' }),
          ...(edu.gpa ? [new TextRun({ text: ` | GPA: ${edu.gpa}`, size: 20, color: '666666' })] : []),
        ],
        spacing: { after: 80 },
      }));
    }
  }

  // Skills
  if (resume.skills.length > 0) {
    sections.push(sectionHeading('SKILLS'));
    sections.push(new Paragraph({
      children: [new TextRun({ text: resume.skills.join(' • '), size: 22 })],
      spacing: { after: 200 },
    }));
  }

  // Certifications
  if (resume.certifications.length > 0) {
    sections.push(sectionHeading('CERTIFICATIONS'));
    for (const cert of resume.certifications) {
      sections.push(new Paragraph({
        children: [
          new TextRun({ text: cert.name, bold: true, size: 22 }),
          new TextRun({ text: ` — ${cert.issuer}`, size: 22 }),
          new TextRun({ text: ` (${cert.date})`, italics: true, size: 20, color: '666666' }),
        ],
        spacing: { after: 80 },
      }));
    }
  }

  return new Document({
    sections: [{ children: sections }],
  });
}

function buildContactSection(contact: ResumeData['contactInfo']): Paragraph[] {
  const paras: Paragraph[] = [];

  if (contact.fullName) {
    paras.push(new Paragraph({
      children: [new TextRun({ text: contact.fullName, bold: true, size: 32 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
    }));
  }

  const details = [contact.email, contact.phone, contact.location, contact.linkedin].filter(Boolean);
  if (details.length > 0) {
    paras.push(new Paragraph({
      children: [new TextRun({ text: details.join(' | '), size: 20, color: '444444' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }));
  }

  return paras;
}

function sectionHeading(title: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: title, bold: true, size: 24, color: '333333' })],
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 120 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC', space: 4 },
    },
  });
}
