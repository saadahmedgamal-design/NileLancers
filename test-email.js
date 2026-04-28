require('dotenv').config();
const nodemailer = require('nodemailer');

async function testEmail() {
  console.log('Testing email configuration...');
  console.log('User:', process.env.EMAIL_USER);
  
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('❌ Error: EMAIL_USER or EMAIL_PASS is missing in .env file');
    return;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  try {
    const info = await transporter.sendMail({
      from: `"NileLancers Test" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // Send to yourself
      subject: 'NileLancers Email Test',
      text: 'If you are reading this, your email configuration is working perfectly! 🚀',
      html: '<b>If you are reading this, your email configuration is working perfectly! 🚀</b>'
    });
    console.log('✅ Success! Email sent:', info.messageId);
    console.log('Please check your inbox (and Spam folder).');
  } catch (error) {
    console.error('❌ Failed to send email:', error.message);
    if (error.message.includes('Invalid login')) {
      console.log('Hint: Check if your App Password is correct and 2-Step Verification is enabled.');
    }
  }
}

testEmail();
