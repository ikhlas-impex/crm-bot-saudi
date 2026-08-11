import { google } from 'googleapis';

export function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  
  console.log('--- Auth Init ---');
  console.log('Email loaded:', !!email);
  console.log('Key loaded:', !!key);
  
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: email,
      private_key: key,
    },
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.file',
    ]
  });
}

export function getSheetsClient() {
  return google.sheets({ version: 'v4', auth: getAuth() });
}
