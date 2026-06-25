// Simple email configuration test
// Run with: node test-email.js

require('dotenv').config({ path: '.env' });

const nodemailer = require('nodemailer');

console.log('=== Email Configuration Test ===\n');

console.log('Environment Variables Check:');
console.log('SMTP_HOST:', process.env.SMTP_HOST ? '✓ Set' : '✗ Missing');
console.log('SMTP_PORT:', process.env.SMTP_PORT ? '✓ Set' : '✗ Missing');
console.log('SMTP_USER:', process.env.SMTP_USER ? '✓ Set' : '✗ Missing');
console.log('SMTP_PASS:', process.env.SMTP_PASS ? '✓ Set' : '✗ Missing');
console.log('SMTP_FROM_NAME:', process.env.SMTP_FROM_NAME ? '✓ Set' : '✗ Missing');

if (!process.env.SMTP_HOST || !process.env.SMTP_PORT || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
  console.error('\n❌ Missing required environment variables. Please check your .env file.');
  process.exit(1);
}

console.log('\n=== Testing Email Connection ===\n');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

transporter.verify(function (error, success) {
  if (error) {
    console.error('❌ Email configuration error:', error);
    console.error('\nCommon issues:');
    console.error('1. Incorrect SMTP credentials');
    console.error('2. SMTP server blocking connections');
    console.error('3. Network/firewall issues');
    console.error('4. Wrong port number (587 for TLS, 465 for SSL)');
  } else {
    console.log('✅ Email server connection successful!');
    console.log('SMTP configuration is working correctly.');
  }
});