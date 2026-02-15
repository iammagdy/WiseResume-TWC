import { ResumeData } from '@/types/resume';
import { downloadFile } from '@/lib/downloadUtils';

/**
 * Generates an ATS-friendly DOCX from resume data and triggers download.
 */
export async function generateAndDownloadDOCX(resume: ResumeData): Promise<boolean> {
  const {
    Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Packer, BorderStyle,
  } = await import('docx');

  const sections: InstanceType<typeof Paragraph>[] = [];

  // Contact header
  const contactParas = buildContactSection(resume.contactInfo, { Paragraph, TextRun, AlignmentType });
  sections.push(...contactParas);

  // Summary
  if (resume.summary) {
    sections.push(makeSectionHeading('PROFESSIONAL SUMMARY', { Paragraph, TextRun, HeadingLevel, BorderStyle }));
    sections.push(new Paragraph({ children: [new TextRun({ text: resume.summary, size: 22 })], spacing: { after: 200 } }));
  }

  // Experience
  if (resume.experience.length > 0) {
    sections.push(makeSectionHeading('EXPERIENCE', { Paragraph, TextRun, HeadingLevel, BorderStyle }));
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
    sections.push(makeSectionHeading('EDUCATION', { Paragraph, TextRun, HeadingLevel, BorderStyle }));
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
    sections.push(makeSectionHeading('SKILLS', { Paragraph, TextRun, HeadingLevel, BorderStyle }));
    sections.push(new Paragraph({
      children: [new TextRun({ text: resume.skills.join(' • '), size: 22 })],
      spacing: { after: 200 },
    }));
  }

  // Certifications
  if (resume.certifications.length > 0) {
    sections.push(makeSectionHeading('CERTIFICATIONS', { Paragraph, TextRun, HeadingLevel, BorderStyle }));
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

  // Projects
  if (resume.projects?.length) {
    sections.push(makeSectionHeading('PROJECTS', { Paragraph, TextRun, HeadingLevel, BorderStyle }));
    for (const proj of resume.projects) {
      sections.push(new Paragraph({
        children: [
          new TextRun({ text: proj.name, bold: true, size: 22 }),
          new TextRun({ text: ` — ${proj.role}`, size: 22 }),
        ],
        spacing: { before: 120 },
      }));
      if (proj.description) {
        sections.push(new Paragraph({ children: [new TextRun({ text: proj.description, size: 22 })], spacing: { after: 60 } }));
      }
      if (proj.technologies?.length) {
        sections.push(new Paragraph({ children: [new TextRun({ text: `Technologies: ${proj.technologies.join(', ')}`, italics: true, size: 20, color: '666666' })], spacing: { after: 80 } }));
      }
    }
  }

  // Awards
  if (resume.awards?.length) {
    sections.push(makeSectionHeading('AWARDS', { Paragraph, TextRun, HeadingLevel, BorderStyle }));
    for (const award of resume.awards) {
      sections.push(new Paragraph({
        children: [
          new TextRun({ text: award.title, bold: true, size: 22 }),
          new TextRun({ text: ` — ${award.issuer}`, size: 22 }),
          new TextRun({ text: ` (${award.date})`, italics: true, size: 20, color: '666666' }),
        ],
        spacing: { after: 40 },
      }));
      if (award.description) {
        sections.push(new Paragraph({ children: [new TextRun({ text: award.description, size: 22 })], spacing: { after: 80 } }));
      }
    }
  }

  // Languages
  if (resume.languages?.length) {
    sections.push(makeSectionHeading('LANGUAGES', { Paragraph, TextRun, HeadingLevel, BorderStyle }));
    sections.push(new Paragraph({
      children: [new TextRun({ text: resume.languages.map(l => `${l.name} (${l.proficiency})`).join(' • '), size: 22 })],
      spacing: { after: 200 },
    }));
  }

  // Publications
  if (resume.publications?.length) {
    sections.push(makeSectionHeading('PUBLICATIONS', { Paragraph, TextRun, HeadingLevel, BorderStyle }));
    for (const pub of resume.publications) {
      sections.push(new Paragraph({
        children: [
          new TextRun({ text: pub.title, bold: true, size: 22 }),
          new TextRun({ text: ` — ${pub.publisher}`, size: 22 }),
          new TextRun({ text: ` (${pub.date})`, italics: true, size: 20, color: '666666' }),
        ],
        spacing: { after: 40 },
      }));
      if (pub.url) {
        sections.push(new Paragraph({ children: [new TextRun({ text: pub.url, size: 20, color: '0066CC' })], spacing: { after: 80 } }));
      }
    }
  }

  // Volunteering
  if (resume.volunteering?.length) {
    sections.push(makeSectionHeading('VOLUNTEERING', { Paragraph, TextRun, HeadingLevel, BorderStyle }));
    for (const vol of resume.volunteering) {
      sections.push(new Paragraph({
        children: [
          new TextRun({ text: vol.role, bold: true, size: 22 }),
          new TextRun({ text: ` — ${vol.organization}`, size: 22 }),
        ],
        spacing: { before: 120 },
      }));
      sections.push(new Paragraph({
        children: [new TextRun({ text: `${vol.startDate} – ${vol.endDate || 'Present'}`, italics: true, size: 20, color: '666666' })],
        spacing: { after: 80 },
      }));
      if (vol.description) {
        sections.push(new Paragraph({ children: [new TextRun({ text: vol.description, size: 22 })], spacing: { after: 60 } }));
      }
    }
  }

  // Hobbies
  if (resume.hobbies?.length) {
    sections.push(makeSectionHeading('HOBBIES & INTERESTS', { Paragraph, TextRun, HeadingLevel, BorderStyle }));
    sections.push(new Paragraph({
      children: [new TextRun({ text: resume.hobbies.join(' • '), size: 22 })],
      spacing: { after: 200 },
    }));
  }

  // References
  if (resume.references?.length) {
    sections.push(makeSectionHeading('REFERENCES', { Paragraph, TextRun, HeadingLevel, BorderStyle }));
    for (const ref of resume.references) {
      sections.push(new Paragraph({
        children: [
          new TextRun({ text: ref.name, bold: true, size: 22 }),
          new TextRun({ text: ` — ${ref.title}, ${ref.company}`, size: 22 }),
        ],
        spacing: { before: 120, after: 40 },
      }));
      const contactDetails = [ref.email, ref.phone].filter(Boolean).join(' | ');
      if (contactDetails) {
        sections.push(new Paragraph({ children: [new TextRun({ text: contactDetails, size: 20, color: '444444' })], spacing: { after: 80 } }));
      }
    }
  }

  const doc = new Document({ sections: [{ children: sections }] });
  const blob = await Packer.toBlob(doc);
  const baseName = resume.contactInfo.fullName?.replace(/\s+/g, '_') || 'Resume';
  const result = await downloadFile({
    blob,
    fileName: `${baseName}_Resume.docx`,
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  return result.success;
}

function buildContactSection(
  contact: ResumeData['contactInfo'],
  deps: { Paragraph: any; TextRun: any; AlignmentType: any },
) {
  const { Paragraph, TextRun, AlignmentType } = deps;
  const paras: any[] = [];

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

function makeSectionHeading(
  title: string,
  deps: { Paragraph: any; TextRun: any; HeadingLevel: any; BorderStyle: any },
) {
  const { Paragraph, TextRun, HeadingLevel, BorderStyle } = deps;
  return new Paragraph({
    children: [new TextRun({ text: title, bold: true, size: 24, color: '333333' })],
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 120 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC', space: 4 },
    },
  });
}
