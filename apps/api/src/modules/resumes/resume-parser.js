import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';

import { AppError } from '../../lib/app-error.js';

const MAX_EXTRACTED_CHARACTERS = 100_000;

const knownSkills = [
  'JavaScript',
  'TypeScript',
  'React',
  'Node.js',
  'Express',
  'MongoDB',
  'HTML',
  'CSS',
  'SQL',
  'Java',
  'Python',
  'C++',
  'C#',
  'Git',
  'REST',
  'Docker',
  'AWS',
];

const sectionHeadingMap = new Map([
  ['summary', 'summary'],
  ['profile', 'summary'],
  ['objective', 'summary'],
  ['skills', 'skills'],
  ['technical skills', 'skills'],
  ['education', 'education'],
  ['academic background', 'education'],
  ['experience', 'experience'],
  ['work experience', 'experience'],
  ['employment', 'experience'],
  ['projects', 'projects'],
  ['project experience', 'projects'],
  ['certifications', 'certifications'],
  ['certificates', 'certifications'],
]);

const normalizeExtractedText = (text) =>
  text
    .replaceAll('\u0000', '')
    .replaceAll('\r\n', '\n')
    .replaceAll('\r', '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const getHeading = (line) => {
  const normalized = line.trim().replace(/:$/, '').toLowerCase();
  return sectionHeadingMap.get(normalized) ?? null;
};

const parseSections = (text) => {
  const sectionLines = {
    summary: [],
    skills: [],
    education: [],
    experience: [],
    projects: [],
    certifications: [],
  };
  let activeSection = 'summary';

  for (const line of text.split('\n')) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    const heading = getHeading(trimmedLine);
    if (heading) {
      activeSection = heading;
      continue;
    }

    const inlineHeading = trimmedLine.match(/^([^:]{2,30}):\s*(.+)$/);
    const inlineSection = inlineHeading
      ? sectionHeadingMap.get(inlineHeading[1].trim().toLowerCase())
      : null;

    if (inlineHeading && inlineSection) {
      activeSection = inlineSection;
      sectionLines[activeSection].push(inlineHeading[2].trim());
      continue;
    }

    sectionLines[activeSection].push(trimmedLine);
  }

  return Object.fromEntries(
    Object.entries(sectionLines).map(([section, lines]) => [section, lines.join('\n')]),
  );
};

export const detectKnownSkills = (text) =>
  knownSkills.filter((skill) => {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^a-z0-9+#.])${escaped}($|[^a-z0-9+#.])`, 'i').test(text);
  });

export const extractResume = async ({ buffer, mimeType }) => {
  let rawText;
  const warnings = [];

  try {
    if (mimeType === 'application/pdf') {
      const parser = new PDFParse({ data: buffer });
      try {
        rawText = (await parser.getText()).text;
      } finally {
        await parser.destroy();
      }
    } else {
      const result = await mammoth.extractRawText({ buffer });
      rawText = result.value;
      warnings.push(...result.messages.map(({ message }) => message));
    }
  } catch {
    throw new AppError(
      422,
      'RESUME_EXTRACTION_FAILED',
      'The resume could not be read. Please upload a text-based PDF or DOCX file.',
    );
  }

  let extractedText = normalizeExtractedText(rawText ?? '');
  if (extractedText.length < 20) {
    throw new AppError(
      422,
      'RESUME_HAS_NO_TEXT',
      'The resume does not contain enough extractable text.',
    );
  }

  if (extractedText.length > MAX_EXTRACTED_CHARACTERS) {
    extractedText = extractedText.slice(0, MAX_EXTRACTED_CHARACTERS);
    warnings.push('Only the first 100,000 extracted characters were retained.');
  }

  return {
    extractedText,
    profile: {
      detectedSkills: detectKnownSkills(extractedText),
      sections: parseSections(extractedText),
    },
    warnings,
  };
};
