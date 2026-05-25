import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import nodemailer from 'nodemailer';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to support incoming JSON payloads up to 15MB for base64 CV transmission
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // API Route: Write runtime logs from phone/simulator to debug-app.log in the project root
  app.post('/api/write-log', (req, res) => {
    const { timestamp, level, message, meta } = req.body;
    if (!message) {
      res.status(400).json({ error: 'Missing log message.' });
      return;
    }

    const logLine = `[${timestamp || new Date().toISOString()}] [${(level || 'info').toUpperCase()}] ${message}${meta ? ' | Meta: ' + JSON.stringify(meta) : ''}\n`;
    
    // Path to debug-app.log in the workspace root
    const logFilePath = path.join(process.cwd(), 'debug-app.log');
    
    fs.appendFile(logFilePath, logLine, (err) => {
      if (err) {
        console.error('Failed to write to debug-app.log:', err);
        res.status(500).json({ error: 'Failed to write log line.' });
      } else {
        res.json({ success: true });
      }
    });
  });

  // API Route: Send single email dynamically via Nodemailer
  app.post('/api/send-email', async (req, res) => {
    const { smtpUser, smtpPass, to, subject, body, attachment } = req.body;

    if (!to || !subject || !body) {
      res.status(400).json({ error: 'Missing standard routing properties: to, subject or body.' });
      return;
    }

    if (!smtpUser || !smtpPass) {
      res.status(400).json({ 
        error: 'Missing Google / SMTP credentials. Please input your Gmail App Password to send emails securely.' 
      });
      return;
    }

    try {
      // Setup Nodemailer transporter with dynamic parameters
      // Gmail standard SMTP is smtp.gmail.com over port 465 (secure) or 587 (TLS)
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true, 
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      // Simple HTML template wrapping text safely for modern email clients:
      const formattedHtml = body.replace(/\n/g, '<br />');

      // Compose message setup
      const mailOptions: {
        from: string;
        to: string;
        subject: string;
        text: string;
        html: string;
        attachments: Array<{ filename: string; content: Buffer; contentType: string }> | undefined;
      } = {
        from: `"${smtpUser.split('@')[0]}" <${smtpUser}>`,
        to: to,
        subject: subject,
        text: body,
        html: `<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #333333;">${formattedHtml}</div>`,
        attachments: undefined,
      };

      // Handle raw base64 PDF attachment dynamically decoded server-side:
      if (attachment && attachment.data && attachment.name) {
        const rawBase64 = attachment.data.split(';base64,').pop(); // support complete data: URIs
        if (rawBase64) {
          mailOptions.attachments = [
            {
              filename: attachment.name,
              content: Buffer.from(rawBase64, 'base64'),
              contentType: attachment.type || 'application/pdf',
            },
          ];
        }
      }

      const info = await transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', info.messageId);
      res.json({ success: true, messageId: info.messageId });
    } catch (err: any) {
      console.error('Nodemailer execution error:', err);
      
      // Return beautiful friendly error description for user interface
      let userFriendlyMsg = err.message || 'Unknown SMTP error occurred.';
      if (err.code === 'EAUTH') {
        userFriendlyMsg = 'Authentication Failed! Please ensure you paste your 16-character Gmail "App Password" (and double check that 2-Factor Auth is enabled on your Gmail Account).';
      }
      res.status(500).json({ error: userFriendlyMsg });
    }
  });

  // API Route: Send single email dynamically using Google OAuth Access Token
  app.post('/api/send-email-oauth', async (req, res) => {
    const { accessToken, senderEmail, to, subject, body, attachment } = req.body;

    if (!to || !subject || !body) {
      res.status(400).json({ error: 'Missing standard routing properties: to, subject or body.' });
      return;
    }

    if (!accessToken || !senderEmail) {
      res.status(400).json({ error: 'Missing OAuth access token or sender email.' });
      return;
    }

    try {
      // Set up Nodemailer transporter with Google OAuth2 dynamic authentication
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          type: 'OAuth2',
          user: senderEmail,
          accessToken: accessToken,
        }
      });

      const formattedHtml = body.replace(/\n/g, '<br />');

      const mailOptions: {
        from: string;
        to: string;
        subject: string;
        text: string;
        html: string;
        attachments: Array<{ filename: string; content: Buffer; contentType: string }> | undefined;
      } = {
        from: `"${senderEmail.split('@')[0]}" <${senderEmail}>`,
        to: to,
        subject: subject,
        text: body,
        html: `<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #333333;">${formattedHtml}</div>`,
        attachments: undefined,
      };

      if (attachment && attachment.data && attachment.name) {
        const rawBase64 = attachment.data.split(';base64,').pop();
        if (rawBase64) {
          mailOptions.attachments = [
            {
              filename: attachment.name,
              content: Buffer.from(rawBase64, 'base64'),
              contentType: attachment.type || 'application/pdf',
            },
          ];
        }
      }

      const info = await transporter.sendMail(mailOptions);
      console.log('OAuth Email sent successfully:', info.messageId);
      res.json({ success: true, messageId: info.messageId });
    } catch (err: any) {
      console.error('Nodemailer OAuth execution error:', err);
      res.status(500).json({ error: err.message || 'OAuth background dispatch failed. Gmail access token may have expired.' });
    }
  });

  // Vite middleware for assets serving in development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Express application active on http://localhost:${PORT}`);
  });
}

startServer();
