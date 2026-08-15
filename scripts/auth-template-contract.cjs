'use strict';

const fs = require('fs');
const path = require('path');

const AUTH_TEMPLATE_DESCRIPTORS = Object.freeze({
  verification: Object.freeze({
    type: 'verification',
    fileName: 'email-verification.html',
    subject: 'Verify your WiseResume email',
  }),
  recovery: Object.freeze({
    type: 'recovery',
    fileName: 'password-recovery.html',
    subject: 'Reset your WiseResume password',
  }),
});

function readManagedAuthTemplate(rootDir, templateType) {
  const descriptor = AUTH_TEMPLATE_DESCRIPTORS[templateType];
  if (!descriptor) throw new Error(`Unsupported auth email template: ${templateType}`);

  const filePath = path.join(rootDir, 'appwrite-hubs', 'email-templates', descriptor.fileName);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Managed auth email template is missing: ${descriptor.fileName}`);
  }

  const message = fs.readFileSync(filePath, 'utf8');
  if (!message.includes('{{redirect}}')) {
    throw new Error(`Managed ${templateType} email template must include {{redirect}}`);
  }

  return {
    type: descriptor.type,
    subject: descriptor.subject,
    message,
  };
}

function readManagedAuthTemplates(rootDir) {
  return Object.fromEntries(
    Object.keys(AUTH_TEMPLATE_DESCRIPTORS).map((templateType) => [
      templateType,
      readManagedAuthTemplate(rootDir, templateType),
    ]),
  );
}

module.exports = {
  AUTH_TEMPLATE_DESCRIPTORS,
  readManagedAuthTemplate,
  readManagedAuthTemplates,
};
