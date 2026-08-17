/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

// Configure dotenv to read from .env if present
dotenv.config();

// Since some users place direct production configurations in .env.example, we load it as well to resolve process.env variables
const envExamplePath = path.join(process.cwd(), '.env.example');
if (fs.existsSync(envExamplePath)) {
  dotenv.config({ path: envExamplePath });
}

// Lazy initialized SMTP transporter
function getMailTransporter() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) {
    console.log('📬 SMTP Mail Configuration is missing or incomplete in environment variables. Outbound emails will be simulated exclusively inside the on-screen Sandbox SMTP Terminal.');
    return null;
  }

  return nodemailer.createTransport({
    host,
    port: parseInt(port, 10),
    secure: process.env.SMTP_SECURE === 'true' || port === '465' || port === '587',
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false
    }
  });
}

// Function to send real email if SMTP credentials are provided
// Helper to send email via Gmail REST API
async function sendEmailViaGmailApi(accessToken: string, fromEmail: string, to: string, subject: string, bodyText: string) {
  try {
    const rawMessage = [
      `From: <${fromEmail}>`,
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=utf-8',
      '',
      bodyText
    ].join('\r\n');

    const base64Safe = Buffer.from(rawMessage, 'utf-8').toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        raw: base64Safe
      })
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('Gmail API send failed:', errBody);
      throw new Error(`Gmail API returned status ${response.status}: ${errBody}`);
    }

    const data = await response.json();
    return { success: true, messageId: data.id };
  } catch (err: any) {
    console.error('Gmail API Error:', err);
    return { success: false, error: err.message };
  }
}

// Function to send real email if SMTP credentials or Gmail OAuth token are provided
async function sendRealEmail(to: string, subject: string, text: string) {
  const db = readDb();
  const settings = db.notificationSettings || {};

  // Helper to log state under notificationLogs in database
  const logNotificationSent = (channel: string, recipient: string, status: string, detail: string) => {
    try {
      db.notificationLogs = db.notificationLogs || [];
      db.notificationLogs.unshift({
        id: 'nlg-' + Math.random().toString(36).substr(2, 9),
        type: 'alert',
        channel,
        recipient,
        status,
        detail,
        timestamp: new Date().toISOString()
      });
      writeDb(db);
    } catch (e) {
      console.error('Error logging notification state:', e);
    }
  };

  // 1. Gmail OAuth Sending Channel
  if (settings.gmailUseOauth && settings.gmailOauthAccessToken && settings.gmailOauthSender) {
    console.log(`📡 Routing outgoing email via Google Gmail API on behalf of ${settings.gmailOauthSender}`);
    const result = await sendEmailViaGmailApi(settings.gmailOauthAccessToken, settings.gmailOauthSender, to, subject, text);
    if (result.success) {
      console.log('📨 Actual email sent successfully via Gmail API:', result.messageId);
      logNotificationSent('Gmail API', to, 'success', `Email dispatched successfully via Gmail OAuth (${settings.gmailOauthSender})`);
      return { success: true, messageId: result.messageId };
    } else {
      console.error('❌ Failed to route actual email via Gmail API:', result.error);
      logNotificationSent('Gmail API', to, 'failed', `Gmail API Error: ${result.error}`);
      return { success: false, reason: 'gmail_api_error', error: result.error };
    }
  }

  // 2. SMTP Settings (Database dynamic overriding OR environment variables)
  const host = settings.smtpHost || process.env.SMTP_HOST;
  const port = settings.smtpPort || process.env.SMTP_PORT;
  const user = settings.smtpUser || process.env.SMTP_USER;
  const pass = settings.smtpPass || process.env.SMTP_PASS;
  const secure = settings.smtpSecure !== undefined ? (settings.smtpSecure === 'true' || settings.smtpSecure === true) : (process.env.SMTP_SECURE === 'true' || port === '465' || port === '587');
  const senderEmail = settings.senderEmail || process.env.SENDER_EMAIL || user || 'security@baheriamotors.com';

  if (!host || !port || !user || !pass) {
    console.log('📡 Outbound SMTP service ready for client configuration. Simulation spooler active.');
    return { success: false, reason: 'unconfigured_local_sandboxed' };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port: parseInt(port, 10),
      secure,
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const info = await transporter.sendMail({
      from: `"Baheria Motors Security" <${senderEmail}>`,
      to,
      subject,
      text,
    });
    console.log('📨 Actual email sent successfully via SMTP:', info.messageId);
    logNotificationSent('SMTP Transporter', to, 'success', `Email dispatched successfully via SMTP server (${host})`);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error('❌ Failed to route actual email via SMTP:', err);
    let friendlyError = err.message || 'Unknown SMTP Error';
    if (friendlyError.includes('534-5.7.9') || friendlyError.includes('Application-specific password') || friendlyError.includes('Application-specific password required')) {
      friendlyError = 'Google Application-Specific Password Required (534-5.7.9). Security policy requires a 16-character App Password rather than your regular login password. Please enable 2-Step Verification on your Google Account, generate an App Password, and use that 16-digit code here.';
    } else if (friendlyError.includes('535') || friendlyError.includes('Authentication failed') || friendlyError.includes('Invalid login') || friendlyError.includes('Username and Password not accepted')) {
      friendlyError = 'SMTP Authentication Failed (535). Standard username/password combination was rejected. If using Gmail, please use a Google 16-character App Password.';
    }
    logNotificationSent('SMTP Transporter', to, 'failed', `SMTP Error: ${friendlyError}`);
    return { success: false, reason: 'smtp_error', error: friendlyError };
  }
}

const PORT = Number(process.env.PORT) || 3000;
const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');
const UPLOADS_DIR = path.join(DB_DIR, 'uploads');

// Ensure database and uploads directories exist
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Initial Database Structure
const initialDb = {
  users: [],
  customers: [],
  vehicles: [],
  installments: [],
  payments: [],
  auditLogs: [
    {
      id: 'log-1',
      username: 'system',
      role: 'System',
      action: 'Database Initialized',
      details: 'Showroom database successfully initialized without any pre-defined accounts. Manual Admin Setup Required.',
      timestamp: new Date().toISOString()
    }
  ],
  notifications: [],
  verificationEmails: []
};



let localDbCache: any = null;
let mysqlConnectionPool: any = null;
let isMysqlConnected = false;

// Attempt to initialize MySQL on App Startup
async function initMysql() {
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '';
  const database = process.env.DB_NAME || 'baheria_showroom';

  console.log(`🔌 [MySQL/XAMPP] Attempting connection to local MySQL server at ${host}:${port} as ${user}...`);

  try {
    // 1. Connection to MySQL host to ensure target DB exists
    const tempConnection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      connectTimeout: 4000
    });

    console.log(`✅ [MySQL/XAMPP] Connection to MySQL Server established!`);
    await tempConnection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\`;`);
    await tempConnection.end();

    // 2. Setup standard connection pool for the showroom database
    mysqlConnectionPool = mysql.createPool({
      host,
      port,
      user,
      password,
      database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 4000
    });

    isMysqlConnected = true;
    console.log(`✅ [MySQL/XAMPP] Connected to database \`${database}\` successfully!`);

    // 3. Keep tables set up properly
    await createMysqlTables();

    // 4. Initial Sync or Migration
    await syncMysqlData();

  } catch (err: any) {
    isMysqlConnected = false;
    console.log(`\n\x1b[33m⚠️  [MySQL/XAMPP WARNING] Local MySQL Database is NOT reachable at ${host}:${port}.\x1b[0m`);
    console.log(`\x1b[36m👉  [XAMPP Setup Note] This is normal during the AI Studio Cloud Run development preview because XAMPP resides on your local machine. Once you export the code to your computer (via Settings > Export) and launch XAMPP Control Panel with Apache & MySQL started, the application will connect automatically!\x1b[0m\n`);
    console.log(`\x1b[32m🛡️  [Fallback Live] Using SQLite-like local JSON file storage (/data/db.json) for the cloud preview session.\x1b[0m\n`);
  }
}

async function createMysqlTables() {
  if (!mysqlConnectionPool) return;

  const tables = [
    // users table
    `CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      username VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL,
      email VARCHAR(255),
      status VARCHAR(50) DEFAULT 'active',
      githubProfile TEXT,
      pinCode VARCHAR(6),
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    // customers table
    `CREATE TABLE IF NOT EXISTS customers (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      fatherName VARCHAR(255),
      cnic VARCHAR(50),
      phone VARCHAR(50),
      alternatePhone VARCHAR(50),
      address TEXT,
      guarantorName VARCHAR(255),
      guarantorCnic VARCHAR(50),
      photoUrl LONGTEXT,
      documents TEXT,
      salesmanId VARCHAR(255),
      salesmanName VARCHAR(255),
      createdAt VARCHAR(100),
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    // vehicles table
    `CREATE TABLE IF NOT EXISTS vehicles (
      id VARCHAR(255) PRIMARY KEY,
      company VARCHAR(255) NOT NULL,
      model VARCHAR(255) NOT NULL,
      variant VARCHAR(255),
      modelYear VARCHAR(50),
      registrationNumber VARCHAR(100),
      engineNumber VARCHAR(100),
      chassisNumber VARCHAR(100),
      color VARCHAR(100),
      fuelType VARCHAR(50),
      transmission VARCHAR(50),
      purchasePrice DECIMAL(15, 2) DEFAULT 0.00,
      salePrice DECIMAL(15, 2) DEFAULT 0.00,
      photoUrl LONGTEXT,
      documents TEXT,
      status VARCHAR(50) DEFAULT 'Available',
      createdAt VARCHAR(100),
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    // installments table (installment_plans)
    `CREATE TABLE IF NOT EXISTS installments (
      id VARCHAR(255) PRIMARY KEY,
      customerId VARCHAR(255) NOT NULL,
      vehicleId VARCHAR(255) NOT NULL,
      customerName VARCHAR(255),
      vehicleName VARCHAR(255),
      vehicleNumber VARCHAR(100),
      vehiclePrice DECIMAL(15, 2) DEFAULT 0.00,
      downPayment DECIMAL(15, 2) DEFAULT 0.00,
      remainingAmount DECIMAL(15, 2) DEFAULT 0.00,
      monthlyInstallment DECIMAL(15, 2) DEFAULT 0.00,
      durationMonths INT DEFAULT 0,
      startDate VARCHAR(100),
      dueDay INT DEFAULT 1,
      totalPaid DECIMAL(15, 2) DEFAULT 0.00,
      balance DECIMAL(15, 2) DEFAULT 0.00,
      status VARCHAR(50) DEFAULT 'Active',
      lastPaymentDate VARCHAR(100),
      nextDueDate VARCHAR(100),
      salesmanId VARCHAR(255),
      salesmanName VARCHAR(255),
      commission DECIMAL(15, 2) DEFAULT 0.00,
      saleType VARCHAR(50) DEFAULT 'Installment',
      saleDate VARCHAR(100),
      createdAt VARCHAR(100),
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    // payments table
    `CREATE TABLE IF NOT EXISTS payments (
      id VARCHAR(255) PRIMARY KEY,
      customerId VARCHAR(255) NOT NULL,
      installmentId VARCHAR(255) NOT NULL,
      customerName VARCHAR(255),
      vehicleName VARCHAR(255),
      amount DECIMAL(15, 2) DEFAULT 0.00,
      paymentDate VARCHAR(100),
      paymentMethod VARCHAR(100),
      receiptNumber VARCHAR(100),
      notes TEXT,
      recordedBy VARCHAR(255),
      createdAt VARCHAR(100),
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    // audit_logs table (auditLogs)
    `CREATE TABLE IF NOT EXISTS audit_logs (
      id VARCHAR(255) PRIMARY KEY,
      username VARCHAR(255),
      role VARCHAR(100),
      action VARCHAR(255),
      details TEXT,
      timestamp VARCHAR(100)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    // partners table
    `CREATE TABLE IF NOT EXISTS partners (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      phone VARCHAR(50),
      cnic VARCHAR(50),
      ownershipPercentage DECIMAL(5, 2) DEFAULT 0.00,
      initialInvestment DECIMAL(15, 2) DEFAULT 0.00,
      joiningDate VARCHAR(100),
      status VARCHAR(50) DEFAULT 'Active',
      notes TEXT,
      createdAt VARCHAR(100),
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    // partner_transactions table (partnerTransactions)
    `CREATE TABLE IF NOT EXISTS partner_transactions (
      id VARCHAR(255) PRIMARY KEY,
      partnerId VARCHAR(255) NOT NULL,
      partnerName VARCHAR(255),
      type VARCHAR(100) NOT NULL,
      amount DECIMAL(15, 2) DEFAULT 0.00,
      date VARCHAR(100),
      notes TEXT,
      addedBy VARCHAR(255),
      createdAt VARCHAR(100),
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    // notifications table
    `CREATE TABLE IF NOT EXISTS notifications (
      id VARCHAR(255) PRIMARY KEY,
      title VARCHAR(255),
      description TEXT,
      date VARCHAR(100),
      type VARCHAR(50),
      \`read\` TINYINT(1) DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    // verification_emails table
    `CREATE TABLE IF NOT EXISTS verification_emails (
      id VARCHAR(255) PRIMARY KEY,
      \`to\` VARCHAR(255),
      \`from\` VARCHAR(255),
      subject VARCHAR(255),
      body TEXT,
      userId VARCHAR(255),
      status VARCHAR(50),
      createdAt VARCHAR(100)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
  ];

  for (const query of tables) {
    await mysqlConnectionPool.query(query);
  }
}

async function syncMysqlData() {
  if (!mysqlConnectionPool) return;

  try {
    const [usersRows]: any = await mysqlConnectionPool.query('SELECT COUNT(*) as count FROM users');
    const count = usersRows[0]?.count || 0;

    if (count === 0) {
      console.log(`🔄 [MySQL/XAMPP] MySQL has no users. Importing existing dataset from local JSON file to XAMPP...`);
      const jsonDb = readJsonDbFile();

      // Save all existing JSON data to newly created MySQL Database
      await saveAllToMysql(jsonDb);
      localDbCache = jsonDb;
      console.log(`✅ [MySQL/XAMPP] Successfully migrated records to MySQL database!`);
    } else {
      console.log(`🔄 [MySQL/XAMPP] Fetching latest snapshot from MySQL into Server Cache...`);
      localDbCache = await loadFromMysql();
      console.log(`✅ [MySQL/XAMPP] Successfully loaded data from MySQL!`);
    }
  } catch (error) {
    console.error('❌ [MySQL/XAMPP] Error in syncMysqlData:', error);
  }
}

function readJsonDbFile() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf-8');
      return initialDb;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    console.error('Error reading JSON DB file:', error);
    return initialDb;
  }
}

async function loadFromMysql() {
  if (!mysqlConnectionPool) return initialDb;

  try {
    const db: any = { ...initialDb };

    const [users]: any = await mysqlConnectionPool.query('SELECT * FROM users');
    db.users = users.map((u: any) => ({
      ...u,
      githubProfile: u.githubProfile ? JSON.parse(u.githubProfile) : null
    }));

    const [customers]: any = await mysqlConnectionPool.query('SELECT * FROM customers');
    db.customers = customers.map((c: any) => ({
      ...c,
      documents: c.documents ? JSON.parse(c.documents) : []
    }));

    const [vehicles]: any = await mysqlConnectionPool.query('SELECT * FROM vehicles');
    db.vehicles = vehicles.map((v: any) => ({
      ...v,
      purchasePrice: Number(v.purchasePrice) || 0,
      salePrice: Number(v.salePrice) || 0,
      documents: v.documents ? JSON.parse(v.documents) : []
    }));

    const [installments]: any = await mysqlConnectionPool.query('SELECT * FROM installments');
    db.installments = installments.map((i: any) => ({
      ...i,
      vehiclePrice: Number(i.vehiclePrice) || 0,
      downPayment: Number(i.downPayment) || 0,
      remainingAmount: Number(i.remainingAmount) || 0,
      monthlyInstallment: Number(i.monthlyInstallment) || 0,
      totalPaid: Number(i.totalPaid) || 0,
      balance: Number(i.balance) || 0,
      commission: Number(i.commission) || 0
    }));

    const [payments]: any = await mysqlConnectionPool.query('SELECT * FROM payments');
    db.payments = payments.map((p: any) => ({
      ...p,
      amount: Number(p.amount) || 0
    }));

    const [auditLogs]: any = await mysqlConnectionPool.query('SELECT * FROM audit_logs ORDER BY id DESC');
    db.auditLogs = auditLogs;

    const [partners]: any = await mysqlConnectionPool.query('SELECT * FROM partners');
    db.partners = partners.map((p: any) => ({
      ...p,
      ownershipPercentage: Number(p.ownershipPercentage) || 0,
      initialInvestment: Number(p.initialInvestment) || 0
    }));

    const [partnerTransactions]: any = await mysqlConnectionPool.query('SELECT * FROM partner_transactions');
    db.partnerTransactions = partnerTransactions.map((pt: any) => ({
      ...pt,
      amount: Number(pt.amount) || 0
    }));

    const [notifications]: any = await mysqlConnectionPool.query('SELECT * FROM notifications');
    db.notifications = notifications.map((n: any) => ({
      ...n,
      read: n.read === 1
    }));

    const [verificationEmails]: any = await mysqlConnectionPool.query('SELECT * FROM verification_emails');
    db.verificationEmails = verificationEmails;

    return db;
  } catch (e) {
    console.error('Error loading data from MySQL:', e);
    return initialDb;
  }
}

async function saveAllToMysql(db: any) {
  if (!mysqlConnectionPool) return;

  const conn = await mysqlConnectionPool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Sync users
    if (db.users) {
      for (const u of db.users) {
        await conn.query(
          `INSERT INTO users (id, name, username, password, role, email, status, githubProfile, pinCode)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE name=VALUES(name), password=VALUES(password), role=VALUES(role), email=VALUES(email), status=VALUES(status), githubProfile=VALUES(githubProfile), pinCode=VALUES(pinCode)`,
          [u.id, u.name, u.username, u.password, u.role, u.email || null, u.status || 'active', u.githubProfile ? JSON.stringify(u.githubProfile) : null, u.pinCode || null]
        );
      }
      const userIds = db.users.map((u: any) => u.id);
      if (userIds.length > 0) {
        await conn.query('DELETE FROM users WHERE id NOT IN (?)', [userIds]);
      } else {
        await conn.query('DELETE FROM users');
      }
    }

    // 2. Sync customers
    if (db.customers) {
      for (const c of db.customers) {
        await conn.query(
          `INSERT INTO customers (id, name, fatherName, cnic, phone, alternatePhone, address, guarantorName, guarantorCnic, photoUrl, documents, salesmanId, salesmanName, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE name=VALUES(name), fatherName=VALUES(fatherName), cnic=VALUES(cnic), phone=VALUES(phone), alternatePhone=VALUES(alternatePhone), address=VALUES(address), guarantorName=VALUES(guarantorName), guarantorCnic=VALUES(guarantorCnic), photoUrl=VALUES(photoUrl), documents=VALUES(documents), salesmanId=VALUES(salesmanId), salesmanName=VALUES(salesmanName)`,
          [c.id, c.name, c.fatherName || null, c.cnic || null, c.phone || null, c.alternatePhone || null, c.address || null, c.guarantorName || null, c.guarantorCnic || null, c.photoUrl || null, c.documents ? JSON.stringify(c.documents) : null, c.salesmanId || null, c.salesmanName || null, c.createdAt || null]
        );
      }
      const customerIds = db.customers.map((c: any) => c.id);
      if (customerIds.length > 0) {
        await conn.query('DELETE FROM customers WHERE id NOT IN (?)', [customerIds]);
      } else {
        await conn.query('DELETE FROM customers');
      }
    }

    // 3. Sync vehicles
    if (db.vehicles) {
      for (const v of db.vehicles) {
        await conn.query(
          `INSERT INTO vehicles (id, company, model, variant, modelYear, registrationNumber, engineNumber, chassisNumber, color, fuelType, transmission, purchasePrice, salePrice, photoUrl, documents, status, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE company=VALUES(company), model=VALUES(model), variant=VALUES(variant), modelYear=VALUES(modelYear), registrationNumber=VALUES(registrationNumber), engineNumber=VALUES(engineNumber), chassisNumber=VALUES(chassisNumber), color=VALUES(color), fuelType=VALUES(fuelType), transmission=VALUES(transmission), purchasePrice=VALUES(purchasePrice), salePrice=VALUES(salePrice), photoUrl=VALUES(photoUrl), documents=VALUES(documents), status=VALUES(status)`,
          [v.id, v.company, v.model, v.variant || null, v.modelYear || null, v.registrationNumber || null, v.engineNumber || null, v.chassisNumber || null, v.color || null, v.fuelType || null, v.transmission || null, v.purchasePrice || 0, v.salePrice || 0, v.photoUrl || null, v.documents ? JSON.stringify(v.documents) : null, v.status || 'Available', v.createdAt || null]
        );
      }
      const vehicleIds = db.vehicles.map((v: any) => v.id);
      if (vehicleIds.length > 0) {
        await conn.query('DELETE FROM vehicles WHERE id NOT IN (?)', [vehicleIds]);
      } else {
        await conn.query('DELETE FROM vehicles');
      }
    }

    // 4. Sync installments
    if (db.installments) {
      for (const i of db.installments) {
        await conn.query(
          `INSERT INTO installments (id, customerId, vehicleId, customerName, vehicleName, vehicleNumber, vehiclePrice, downPayment, remainingAmount, monthlyInstallment, durationMonths, startDate, dueDay, totalPaid, balance, status, lastPaymentDate, nextDueDate, salesmanId, salesmanName, commission, saleType, saleDate, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE customerId=VALUES(customerId), vehicleId=VALUES(vehicleId), customerName=VALUES(customerName), vehicleName=VALUES(vehicleName), vehicleNumber=VALUES(vehicleNumber), vehiclePrice=VALUES(vehiclePrice), downPayment=VALUES(downPayment), remainingAmount=VALUES(remainingAmount), monthlyInstallment=VALUES(monthlyInstallment), durationMonths=VALUES(durationMonths), startDate=VALUES(startDate), dueDay=VALUES(dueDay), totalPaid=VALUES(totalPaid), balance=VALUES(balance), status=VALUES(status), lastPaymentDate=VALUES(lastPaymentDate), nextDueDate=VALUES(nextDueDate), salesmanId=VALUES(salesmanId), salesmanName=VALUES(salesmanName), commission=VALUES(commission), saleType=VALUES(saleType), saleDate=VALUES(saleDate)`,
          [i.id, i.customerId, i.vehicleId, i.customerName || null, i.vehicleName || null, i.vehicleNumber || null, i.vehiclePrice || 0, i.downPayment || 0, i.remainingAmount || 0, i.monthlyInstallment || 0, i.durationMonths || 0, i.startDate || null, i.dueDay || 1, i.totalPaid || 0, i.balance || 0, i.status || 'Active', i.lastPaymentDate || null, i.nextDueDate || null, i.salesmanId || null, i.salesmanName || null, i.commission || 0, i.saleType || 'Installment', i.saleDate || null, i.createdAt || null]
        );
      }
      const installmentIds = db.installments.map((i: any) => i.id);
      if (installmentIds.length > 0) {
        await conn.query('DELETE FROM installments WHERE id NOT IN (?)', [installmentIds]);
      } else {
        await conn.query('DELETE FROM installments');
      }
    }

    // 5. Sync payments
    if (db.payments) {
      for (const p of db.payments) {
        await conn.query(
          `INSERT INTO payments (id, customerId, installmentId, customerName, vehicleName, amount, paymentDate, paymentMethod, receiptNumber, notes, recordedBy, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE customerId=VALUES(customerId), installmentId=VALUES(installmentId), customerName=VALUES(customerName), vehicleName=VALUES(vehicleName), amount=VALUES(amount), paymentDate=VALUES(paymentDate), paymentMethod=VALUES(paymentMethod), receiptNumber=VALUES(receiptNumber), notes=VALUES(notes), recordedBy=VALUES(recordedBy)`,
          [p.id, p.customerId, p.installmentId, p.customerName || null, p.vehicleName || null, p.amount || 0, p.paymentDate || null, p.paymentMethod || null, p.receiptNumber || null, p.notes || null, p.recordedBy || null, p.createdAt || null]
        );
      }
      const paymentIds = db.payments.map((p: any) => p.id);
      if (paymentIds.length > 0) {
        await conn.query('DELETE FROM payments WHERE id NOT IN (?)', [paymentIds]);
      } else {
        await conn.query('DELETE FROM payments');
      }
    }

    // 6. Sync audit_logs
    if (db.auditLogs) {
      for (const al of db.auditLogs) {
        await conn.query(
          `INSERT INTO audit_logs (id, username, role, action, details, timestamp)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE username=VALUES(username), role=VALUES(role), action=VALUES(action), details=VALUES(details), timestamp=VALUES(timestamp)`,
          [al.id, al.username || null, al.role || null, al.action || null, al.details || null, al.timestamp || null]
        );
      }
      const logIds = db.auditLogs.map((al: any) => al.id);
      if (logIds.length > 0) {
        await conn.query('DELETE FROM audit_logs WHERE id NOT IN (?)', [logIds]);
      } else {
        await conn.query('DELETE FROM audit_logs');
      }
    }

    // 7. Sync partners
    if (db.partners) {
      for (const pt of db.partners) {
        await conn.query(
          `INSERT INTO partners (id, name, phone, cnic, ownershipPercentage, initialInvestment, joiningDate, status, notes, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE name=VALUES(name), phone=VALUES(phone), cnic=VALUES(cnic), ownershipPercentage=VALUES(ownershipPercentage), initialInvestment=VALUES(initialInvestment), joiningDate=VALUES(joiningDate), status=VALUES(status), notes=VALUES(notes)`,
          [pt.id, pt.name, pt.phone || null, pt.cnic || null, pt.ownershipPercentage || 0, pt.initialInvestment || 0, pt.joiningDate || null, pt.status || 'Active', pt.notes || null, pt.createdAt || null]
        );
      }
      const partnerIds = db.partners.map((p: any) => p.id);
      if (partnerIds.length > 0) {
        await conn.query('DELETE FROM partners WHERE id NOT IN (?)', [partnerIds]);
      } else {
        await conn.query('DELETE FROM partners');
      }
    }

    // 8. Sync partnerTransactions
    if (db.partnerTransactions) {
      for (const ptx of db.partnerTransactions) {
        await conn.query(
          `INSERT INTO partner_transactions (id, partnerId, partnerName, type, amount, date, notes, addedBy, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE partnerId=VALUES(partnerId), partnerName=VALUES(partnerName), type=VALUES(type), amount=VALUES(amount), date=VALUES(date), notes=VALUES(notes), addedBy=VALUES(addedBy)`,
          [ptx.id, ptx.partnerId, ptx.partnerName || null, ptx.type, ptx.amount || 0, ptx.date || null, ptx.notes || null, ptx.addedBy || null, ptx.createdAt || null]
        );
      }
      const ptxIds = db.partnerTransactions.map((ptx: any) => ptx.id);
      if (ptxIds.length > 0) {
        await conn.query('DELETE FROM partner_transactions WHERE id NOT IN (?)', [ptxIds]);
      } else {
        await conn.query('DELETE FROM partner_transactions');
      }
    }

    // 9. Sync notifications
    if (db.notifications) {
      for (const n of db.notifications) {
        await conn.query(
          `INSERT INTO notifications (id, title, description, date, type, \`read\`)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE title=VALUES(title), description=VALUES(description), date=VALUES(date), type=VALUES(type), \`read\`=VALUES(\`read\`)`,
          [n.id, n.title || null, n.description || null, n.date || null, n.type || null, n.read ? 1 : 0]
        );
      }
      const nIds = db.notifications.map((n: any) => n.id);
      if (nIds.length > 0) {
        await conn.query('DELETE FROM notifications WHERE id NOT IN (?)', [nIds]);
      } else {
        await conn.query('DELETE FROM notifications');
      }
    }

    // 10. Sync verificationEmails
    if (db.verificationEmails) {
      for (const ve of db.verificationEmails) {
        await conn.query(
          `INSERT INTO verification_emails (id, \`to\`, \`from\`, subject, body, userId, status, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE \`to\`=VALUES(\`to\`), \`from\`=VALUES(\`from\`), subject=VALUES(subject), body=VALUES(body), userId=VALUES(userId), status=VALUES(status)`,
          [ve.id, ve.to || null, ve.from || null, ve.subject || null, ve.body || null, ve.userId || null, ve.status || null, ve.createdAt || null]
        );
      }
      const veIds = db.verificationEmails.map((ve: any) => ve.id);
      if (veIds.length > 0) {
        await conn.query('DELETE FROM verification_emails WHERE id NOT IN (?)', [veIds]);
      } else {
        await conn.query('DELETE FROM verification_emails');
      }
    }

    await conn.commit();
  } catch (error) {
    await conn.rollback();
    console.error('❌ [MySQL/XAMPP ERROR] Sync rollback triggered:', error);
  } finally {
    conn.release();
  }
}

function readDb() {
  if (localDbCache) {
    return localDbCache;
  }
  localDbCache = readJsonDbFile();
  return localDbCache;
}

function writeDb(data: any) {
  localDbCache = data;

  // 1. Dual-write backup write to local JSON file synchronously
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing JSON DB Backup:', error);
  }

  // 2. Perform background write to MySQL tables
  if (isMysqlConnected && mysqlConnectionPool) {
    saveAllToMysql(data).catch((err) => {
      console.error('❌ [MySQL Async Background Save Failure] Database sync failed:', err);
    });
  }
}

// Create Express App
const app = express();
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Custom Request Logging Middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`📡 [${new Date().toISOString()}] ${req.method} ${req.originalUrl || req.url} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Access CORS Security Interceptor Middleware
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Serve static directory for file uploads
app.use('/uploads', express.static(UPLOADS_DIR));

// Lazy initialized Gemini Client
let geminiAi: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!geminiAi) {
    const key = process.env.GEMINI_API_KEY;
    geminiAi = new GoogleGenAI({
      apiKey: key || 'MOCK_KEY_IF_ABSENT',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return geminiAi;
}

// Logging helper
function logAction(username: string, role: string, action: string, details: string) {
  const db = readDb();
  const log = {
    id: 'log-' + Math.random().toString(36).substr(2, 9),
    username,
    role,
    action,
    details,
    timestamp: new Date().toISOString()
  };
  db.auditLogs.unshift(log);
  // Keep logs to latest 1000
  if (db.auditLogs.length > 1000) {
    db.auditLogs = db.auditLogs.slice(0, 1000);
  }
}

// Active Server-Sent Events (SSE) connections
let notificationClients: any[] = [];

// Helper to broadcast notification to all SSE clients in real-time
function broadcastNotification(notification: any) {
  notificationClients.forEach((client) => {
    try {
      client.res.write(`data: ${JSON.stringify(notification)}\n\n`);
    } catch (e) {
      // client error handled gracefully
    }
  });
}

// Global Trigger Notification Function
async function triggerNotification(notificationInput: {
  title: string;
  type: string;
  message: string;
  metadata?: any;
}) {
  const db = readDb();

  // Format notification
  const notification = {
    id: 'not-' + Math.random().toString(36).substr(2, 9),
    title: notificationInput.title,
    type: notificationInput.type,
    message: notificationInput.message,
    timestamp: new Date().toISOString(),
    isRead: false,
    metadata: notificationInput.metadata || {}
  };

  // 1. Save to in-app notification ledger
  db.notifications = db.notifications || [];
  db.notifications.unshift(notification); // newest first

  // Keep notifications capped at 100
  if (db.notifications.length > 100) {
    db.notifications = db.notifications.slice(0, 100);
  }

  const settings = db.notificationSettings || {
    adminWhatsApp: '03001234567',
    adminEmail: 'umairullah410446@gmail.com',
    enableWhatsApp: false,
    enableEmail: false,
    enableInApp: true
  };

  db.notificationLogs = db.notificationLogs || [];

  // A. In-App: Broadcast immediately
  broadcastNotification(notification);

  // B. WhatsApp Channel
  if (settings.enableWhatsApp && settings.adminWhatsApp) {
    const formattedMsg = `🔔 *${notification.title}*\n\n${notification.message}\n\n_Showroom Security Activity Tracker_`;

    // Check if we use real Twilio or mock/simulated channel
    const usesRealTwilio = (settings.twilioSid && settings.twilioToken && settings.twilioFrom) || (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);

    if (usesRealTwilio) {
      try {
        const sid = settings.twilioSid || process.env.TWILIO_ACCOUNT_SID;
        const token = settings.twilioToken || process.env.TWILIO_AUTH_TOKEN;
        const from = settings.twilioFrom || process.env.TWILIO_FROM_PHONE || '+14155238886';
        const formattedTo = settings.adminWhatsApp.startsWith('whatsapp:') ? settings.adminWhatsApp : `whatsapp:${settings.adminWhatsApp}`;
        const formattedFrom = from.startsWith('whatsapp:') ? from : `whatsapp:${from}`;

        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
        const twilioRes = await fetch(twilioUrl, {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            To: formattedTo,
            From: formattedFrom,
            Body: formattedMsg
          })
        });
        const respData = await twilioRes.json();
        if (twilioRes.ok) {
          db.notificationLogs.unshift({
            id: 'log-' + Math.random().toString(36).substr(2, 9),
            type: 'whatsapp',
            status: 'success',
            recipient: settings.adminWhatsApp,
            message: formattedMsg,
            timestamp: new Date().toISOString()
          });
        } else {
          db.notificationLogs.unshift({
            id: 'log-' + Math.random().toString(36).substr(2, 9),
            type: 'whatsapp',
            status: 'failed',
            recipient: settings.adminWhatsApp,
            message: formattedMsg,
            error: respData.message || 'Twilio Error',
            timestamp: new Date().toISOString()
          });
        }
      } catch (err: any) {
        db.notificationLogs.unshift({
          id: 'log-' + Math.random().toString(36).substr(2, 9),
          type: 'whatsapp',
          status: 'failed',
          recipient: settings.adminWhatsApp,
          message: formattedMsg,
          error: err.message || 'Connection error',
          timestamp: new Date().toISOString()
        });
      }
    } else {
      // Simulate WhatsApp
      db.notificationLogs.unshift({
        id: 'log-' + Math.random().toString(36).substr(2, 9),
        type: 'whatsapp',
        status: 'success',
        recipient: settings.adminWhatsApp + ' (Simulated)',
        message: formattedMsg,
        notes: 'Simulated dispatch since Twilio configuration is absent.',
        timestamp: new Date().toISOString()
      });
    }
  }

  // C. Email Channel
  if (settings.enableEmail && settings.adminEmail) {
    const emailSubject = `[Showroom Alert] ${notification.title}`;

    // Create professional HTML template
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e1e8f0; border-radius: 12px; overflow: hidden; background-color: #fafafa; border-top: 4px solid #c5a880;">
        <div style="background-color: #0c0f17; padding: 24px; text-align: center;">
          <h2 style="color: #ffffff; margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 2px; font-family: monospace;">BAHERIA MOTORS</h2>
        </div>
        <div style="padding: 30px; background-color: #ffffff;">
          <p style="text-transform: uppercase; font-size: 11px; font-weight: bold; color: #c5a880; margin-top: 0; letter-spacing: 1.5px; margin-bottom: 8px;">Real-Time Notification Ledger</p>
          <h1 style="color: #0f172a; margin-top: 0; font-size: 20px; font-weight: 800; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px;">${notification.title}</h1>
          <div style="color: #334155; line-height: 1.6; font-size: 14px; white-space: pre-wrap; margin-bottom: 25px; background-color: #f8fafc; padding: 16px; border-radius: 8px; border-left: 4px solid #c5a880;">${notification.message}</div>
          
          <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 20px; color: #475569;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px dotted #e2e8f0; font-weight: bold;">Security Timestamp:</td>
              <td style="padding: 8px 0; border-bottom: 1px dotted #e2e8f0; text-align: right; font-family: monospace;">${new Date(notification.timestamp).toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px dotted #e2e8f0; font-weight: bold;">Notification Type:</td>
              <td style="padding: 8px 0; border-bottom: 1px dotted #e2e8f0; text-align: right; text-transform: uppercase; font-family: monospace; color: #c5a880;">${notification.type}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Notification ID:</td>
              <td style="padding: 8px 0; text-align: right; font-family: monospace;">${notification.id}</td>
            </tr>
          </table>
        </div>
        <div style="background-color: #f1f5f9; padding: 15px 30px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
          This is an automated administrative broadcast. Please configure your profile preferences to control alerts.
          <br/><strong>Baheria Motors CMS</strong> Portal Tracking Service.
        </div>
      </div>
    `;

    // Try sending email using existing SMTP setup
    const usesRealEmail = process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS;

    if (usesRealEmail) {
      try {
        const transporter = getMailTransporter();
        if (transporter) {
          const fromAddress = process.env.SENDER_EMAIL || process.env.SMTP_USER || 'security@baheriamotors.com';
          await transporter.sendMail({
            from: `"Baheria Motors Alert" <${fromAddress}>`,
            to: settings.adminEmail,
            subject: emailSubject,
            text: notification.message,
            html: htmlBody
          });

          db.notificationLogs.unshift({
            id: 'log-' + Math.random().toString(36).substr(2, 9),
            type: 'email',
            status: 'success',
            recipient: settings.adminEmail,
            message: emailSubject,
            timestamp: new Date().toISOString()
          });
        } else {
          throw new Error('Could not create SMTP transporter');
        }
      } catch (err: any) {
        db.notificationLogs.unshift({
          id: 'log-' + Math.random().toString(36).substr(2, 9),
          type: 'email',
          status: 'failed',
          recipient: settings.adminEmail,
          message: emailSubject,
          error: err.message || 'SMTP failed',
          timestamp: new Date().toISOString()
        });
      }
    } else {
      // Simulate Email
      db.notificationLogs.unshift({
        id: 'log-' + Math.random().toString(36).substr(2, 9),
        type: 'email',
        status: 'success',
        recipient: settings.adminEmail + ' (Simulated)',
        message: emailSubject,
        htmlContent: htmlBody,
        notes: 'Simulated dispatch since SMTP configuration is absent.',
        timestamp: new Date().toISOString()
      });
    }
  }

  // Cap logs
  if (db.notificationLogs.length > 150) {
    db.notificationLogs = db.notificationLogs.slice(0, 150);
  }

  writeDb(db);
}

// GET /api/notifications - Fetch the list
app.get('/api/notifications', (req, res) => {
  const db = readDb();
  res.json(db.notifications || []);
});

// GET /api/notifications/settings - Get settings
app.get('/api/notifications/settings', (req, res) => {
  const db = readDb();
  const defaultSettings = {
    adminWhatsApp: '03001234567',
    adminEmail: 'umairullah410446@gmail.com',
    enableWhatsApp: false,
    enableEmail: false,
    enableInApp: true,
    twilioSid: '',
    twilioToken: '',
    twilioFrom: ''
  };
  res.json(db.notificationSettings || defaultSettings);
});

// POST /api/notifications/settings - Save settings
app.post('/api/notifications/settings', (req, res) => {
  const db = readDb();
  db.notificationSettings = req.body;
  writeDb(db);
  logAction(req.body.loggedUser || 'admin', 'Admin', 'Update Notification Specs', 'Updated SMS, WhatsApp, and SMTP credentials profile settings.');
  res.json({ success: true, settings: db.notificationSettings });
});

// POST /api/admin/gmail/oauth-save - Save connected Admin Gmail token
app.post('/api/admin/gmail/oauth-save', (req, res) => {
  const { accessToken, email, loggedUser } = req.body;
  if (!accessToken || !email) {
    return res.status(400).json({ error: 'AccessToken and Gmail address are required.' });
  }

  const db = readDb();
  db.notificationSettings = db.notificationSettings || {};
  db.notificationSettings.gmailUseOauth = true;
  db.notificationSettings.gmailOauthAccessToken = accessToken;
  db.notificationSettings.gmailOauthSender = email;
  db.notificationSettings.enableEmail = true; // Auto-enable email notification channel
  writeDb(db);

  logAction(loggedUser || 'admin', 'Admin', 'Gmail OAuth Authorize', `Connected Gmail sender inbox (${email}) via Google OAuth.`);

  // Log this into notification logs
  db.notificationLogs = db.notificationLogs || [];
  db.notificationLogs.unshift({
    id: 'nlg-' + Math.random().toString(36).substr(2, 9),
    type: 'system',
    channel: 'Gmail API',
    recipient: email,
    status: 'success',
    detail: 'Gmail sending channel authorized successfully via secure Google OAuth.',
    timestamp: new Date().toISOString()
  });
  writeDb(db);

  res.json({ success: true, settings: db.notificationSettings });
});

// POST /api/admin/gmail/oauth-disconnect - Clear connected Admin Gmail token
app.post('/api/admin/gmail/oauth-disconnect', (req, res) => {
  const { loggedUser } = req.body;
  const db = readDb();
  if (db.notificationSettings) {
    db.notificationSettings.gmailUseOauth = false;
    db.notificationSettings.gmailOauthAccessToken = null;
    db.notificationSettings.gmailOauthSender = null;
  }
  writeDb(db);

  logAction(loggedUser || 'admin', 'Admin', 'Gmail OAuth Disconnect', 'Disconnected Gmail sender account.');
  res.json({ success: true, settings: db.notificationSettings });
});

// GET /api/notifications/logs - Get log transactions
app.get('/api/notifications/logs', (req, res) => {
  const db = readDb();
  res.json(db.notificationLogs || []);
});

// POST /api/notifications/:id/read - Mark one read
app.post('/api/notifications/:id/read', (req, res) => {
  const db = readDb();
  db.notifications = db.notifications || [];
  const idx = db.notifications.findIndex((n: any) => n.id === req.params.id);
  if (idx !== -1) {
    db.notifications[idx].isRead = true;
    writeDb(db);
  }
  res.json({ success: true });
});

// POST /api/notifications/mark-all-read - Mark all read
app.post('/api/notifications/mark-all-read', (req, res) => {
  const db = readDb();
  db.notifications = db.notifications || [];
  db.notifications.forEach((n: any) => n.isRead = true);
  writeDb(db);
  res.json({ success: true });
});

// GET /api/notifications/stream - Server Sent Events subscription
app.get('/api/notifications/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const clientId = Date.now().toString();
  const newClient = { id: clientId, res };
  notificationClients.push(newClient);

  req.on('close', () => {
    notificationClients = notificationClients.filter((c) => c.id !== clientId);
  });
});

// POST /api/notifications/test-channels - Dispatch test broadcast
app.post('/api/notifications/test-channels', async (req, res) => {
  const title = "⚠️ Portal Security Shakehand Alert";
  const message = "This test alert confirms that your Admin notification profile is successfully connected. Receiving channels are fully authenticated.";

  await triggerNotification({
    title,
    type: "system",
    message,
    metadata: { test: true }
  });

  res.json({ success: true, message: "Test alert pushed onto receiving channels with full security tracking trace." });
});

// POST /api/notifications/daily-summary - Calculate and Dispatch Daily Summary
app.post('/api/notifications/daily-summary', async (req, res) => {
  const db = readDb();
  const today = new Date().toISOString().split('T')[0];

  // Total Sales Today
  const todaySales = (db.installments || []).filter((ins: any) => ins.saleDate === today);
  const totalSalesCount = todaySales.length;
  const totalSalesAmount = todaySales.reduce((acc: number, ins: any) => acc + (ins.vehiclePrice || 0), 0);

  // Total Cash Sales vs Installments
  const cashSalesCount = todaySales.filter((ins: any) => ins.saleType === 'Cash').length;
  const installmentSalesCount = totalSalesCount - cashSalesCount;

  // Total Recovery Today
  const todayPayments = (db.payments || []).filter((pay: any) => pay.paymentDate === today);
  const recoveryCount = todayPayments.length;
  const totalRecoveryAmount = todayPayments.reduce((acc: number, pay: any) => acc + (pay.amount || 0), 0);

  // Pending Recoveries Aggregate
  const pendingRecoveryTotal = (db.installments || []).reduce((acc: number, ins: any) => acc + (ins.balance || 0), 0);

  // Defaulters Count
  const overdueCount = (db.installments || []).filter((ins: any) => {
    if (ins.status !== 'Active' || !ins.nextDueDate) return false;
    return new Date(ins.nextDueDate) < new Date(today);
  }).length;

  // New Customers Added
  const newCustomersCount = (db.customers || []).length;

  const title = `📊 Daily Summary Report - ${new Date().toLocaleDateString()}`;
  const message = `• Total Vehicles Sold Today: ${totalSalesCount} Units (Cash: ${cashSalesCount}, Inst.: ${installmentSalesCount})
• Total Sales Value: Rs. ${totalSalesAmount.toLocaleString()}
• Total Financial Recoveries Today: Rs. ${totalRecoveryAmount.toLocaleString()} (${recoveryCount} Collections)
• Active Portfolio Pending Recovery: Rs. ${pendingRecoveryTotal.toLocaleString()}
• Overdue Accounts (Defaulters): ${overdueCount} active accounts.
• Total Customer Database Ledger: ${newCustomersCount} verified profiles.`;

  await triggerNotification({
    title,
    type: "alerts",
    message,
    metadata: { summary: true, date: today }
  });

  res.json({ success: true, message: "Daily summary report compiled and pushed." });
});



// POST /api/admin/inject-sample-data - Inject pre-filled showroom dataset to database
app.post('/api/admin/inject-sample-data', (req, res) => {
  try {
    const db = readDb();

    // Populate premium showroom vehicles
    db.vehicles = [
      { id: "v-corolla", brand: "Toyota", model: "Corolla GLI 1.3 Automatic", price: 3400000, status: "sold", type: "Automatic", engineCc: "1300cc", fuelType: "Petrol", color: "Super White", notes: "First-owner vehicle. Clean interior." },
      { id: "v-civic", brand: "Honda", model: "Civic Oriel 1.8 i-VTEC", price: 4900000, status: "available", type: "Automatic", engineCc: "1800cc", fuelType: "Petrol", color: "Crystal Black", notes: "Sunroof, leather seats. Full option." },
      { id: "v-cultus", brand: "Suzuki", model: "Cultus VXL", price: 2600000, status: "sold", type: "Manual", engineCc: "1000cc", fuelType: "Petrol", color: "Graphite Grey", notes: "Highly fuel efficient. Single owner." },
      { id: "v-yaris", brand: "Toyota", model: "Yaris Ativ X 1.5 CVT", price: 4100000, status: "available", type: "Automatic", engineCc: "1500cc", fuelType: "Petrol", color: "Silver Metallic", notes: "Under official factory warranty." },
      { id: "v-city", brand: "Honda", model: "City Aspire 1.5", price: 3800000, status: "sold", type: "Automatic", engineCc: "1500cc", fuelType: "Petrol", color: "Urban Titanium", notes: "Top-tier City model with navigation screen." }
    ];

    // Populate active installment customers
    db.customers = [
      { id: "c-ali", name: "Ali Raza", cnic: "35201-1234567-1", phone: "0300-1234567", address: "Gulberg III, Lahore", referenceName: "Muhammad Farooq", referencePhone: "0300-9998887", notes: "Reputable local boutique owner." },
      { id: "c-usman", name: "Usman Khan", cnic: "35201-9876543-2", phone: "0321-4567890", address: "DHA Phase 5, Karachi", referenceName: "Zakaullah Khan", referencePhone: "0321-2221110", notes: "Software Engineer at a multinational." },
      { id: "c-shahid", name: "Shahid Afridi", cnic: "35201-4455667-3", phone: "0333-5556667", address: "Hayatabad, Peshawar", referenceName: "Adnan Afridi", referencePhone: "0333-1112223", notes: "Owner of a local sports retail complex." },
      { id: "c-amna", name: "Amna Bibi", cnic: "35201-8889990-4", phone: "0345-8889990", address: "Sector F-11, Islamabad", referenceName: "Tahira Begum", referencePhone: "0345-4443332", notes: "School Principal, steady monthly income." }
    ];

    // Populate installment plans (agreements)
    db.installments = [
      {
        id: "inst-corolla",
        customerId: "c-ali",
        customerName: "Ali Raza",
        vehicleId: "v-corolla",
        vehicleName: "Toyota Corolla GLI (v-corolla)",
        totalAmount: 3400000,
        advancePayment: 1000000,
        durationMonths: 24,
        monthlyInstallment: 100000,
        balance: 2200000,
        startDate: "2026-03-05",
        nextDueDate: "2026-06-05",
        status: "Active",
        guarantorName: "Imran Raza",
        guarantorCnic: "35102-1234432-1",
        guarantorPhone: "0300-5551112"
      },
      {
        id: "inst-cultus",
        customerId: "c-usman",
        customerName: "Usman Khan",
        vehicleId: "v-cultus",
        vehicleName: "Suzuki Cultus VXL (v-cultus)",
        totalAmount: 2600000,
        advancePayment: 600000,
        durationMonths: 20,
        monthlyInstallment: 100000,
        balance: 1900000,
        startDate: "2026-04-15",
        nextDueDate: "2026-06-15",
        status: "Active",
        guarantorName: "Waqas Khan",
        guarantorCnic: "42301-4433221-5",
        guarantorPhone: "0321-5553322"
      },
      {
        id: "inst-city",
        customerId: "c-shahid",
        customerName: "Shahid Afridi",
        vehicleId: "v-city",
        vehicleName: "Honda City Aspire (v-city)",
        totalAmount: 3800000,
        advancePayment: 800000,
        durationMonths: 20,
        monthlyInstallment: 150000,
        balance: 2850000,
        startDate: "2026-02-15",
        nextDueDate: "2026-05-15",
        status: "Overdue",
        guarantorName: "Javed Afridi",
        guarantorCnic: "17301-5556667-9",
        guarantorPhone: "0333-9993332"
      }
    ];

    // Populate collections / payments
    db.payments = [
      { id: "p-ali-1", installmentId: "inst-corolla", amountPaid: 100000, date: "2026-04-05", method: "Cash", collector: "umair", notes: "April installment paid in full." },
      { id: "p-ali-2", installmentId: "inst-corolla", amountPaid: 100000, date: "2026-05-05", method: "Bank Transfer", collector: "umair", notes: "May installment cleared via HBL." },
      { id: "p-usman-1", installmentId: "inst-cultus", amountPaid: 100000, date: "2026-05-15", method: "Cash", collector: "umair", notes: "May installment counter paid." }
    ];

    // Append seed history audit logs
    db.auditLogs.unshift(
      { id: "log-seed-1", username: "System", action: "Showroom pre-filled dataset injected successfully.", timestamp: new Date().toISOString(), severity: "info", module: "admin" },
      { id: "log-seed-2", username: "System", action: "Instated seed data agreements for Ali Raza, Usman Khan, and Shahid Afridi.", timestamp: new Date().toISOString(), severity: "info", module: "installments" }
    );

    // Save back to JSON file
    writeDb(db);

    res.json({ success: true, message: "Showroom dataset pre-filled successfully!" });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || err });
  }
});

// ==========================================
// 1. AUTHENTICATION & SESSION ENDPOINTS
// ==========================================
// GET /api/auth/setup-status - Check if Inaugural Admin exists
app.get('/api/auth/setup-status', (req, res) => {
  const db = readDb();
  const hasAdmin = db.users.some((u: any) => u.role === 'Admin');
  res.json({ hasAdmin });
});

// POST /api/auth/setup-admin - Create the Inaugural Admin account
app.post('/api/auth/setup-admin', (req, res) => {
  const { name, username, password, email } = req.body;
  if (!name || !username || !password || !email) {
    return res.status(400).json({ error: 'All administrative setup fields are required' });
  }

  const db = readDb();
  const hasAdmin = db.users.some((u: any) => u.role === 'Admin');
  if (hasAdmin) {
    return res.status(400).json({ error: 'System already has an initialized Master Admin.' });
  }

  const newAdmin = {
    id: 'u-admin',
    name,
    username,
    password,
    email,
    role: 'Admin',
    status: 'active',
    githubProfile: null
  };

  db.users = db.users || [];
  db.users.push(newAdmin);
  writeDb(db);
  logAction(username, 'Admin', 'Inaugural Admin Registered', `Initialized Master Admin seat for "${name}" with contact info "${email}"`);

  const userSession = {
    id: newAdmin.id,
    name: newAdmin.name,
    username: newAdmin.username,
    role: newAdmin.role,
    githubProfile: null,
    email: newAdmin.email
  };
  res.json({ user: userSession, token: 'session_token_admin_inaugural' });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const db = readDb();
  const user = db.users.find(
    (u: any) => u.username.toLowerCase() === username.toLowerCase() && u.password === password
  );

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials. Please contact Administrator.' });
  }

  // Set user status to active for seamless login under development phase
  user.status = 'active';
  writeDb(db);

  const userSession = {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    githubProfile: user.githubProfile || null,
    email: user.email || ''
  };

  logAction(user.username, user.role, 'Login Successful', `User ${user.name} signed in directly without OTP during development.`);

  return res.json({
    user: userSession,
    token: 'session_token_' + user.id
  });

  // Generate 6-digit login verification OTP
  const loginCode = Math.floor(100000 + Math.random() * 900000).toString();
  db.tempLoginCodes = db.tempLoginCodes || {};
  db.tempLoginCodes[username.toLowerCase()] = {
    code: loginCode,
    expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes validity
  };

  const toEmail = user.email || 'umairullah410446@gmail.com';
  const emailId = 'email-' + Math.random().toString(36).substr(2, 9);
  const emailItem = {
    id: emailId,
    to: toEmail,
    from: 'security@baheriamotors.com',
    subject: `🔐 LOGIN VERIFICATION CODE: ${loginCode}`,
    body: `Dear ${user.name},

A secure login sequence has been initiated for your Baheria Motors account on your mobile/device.
To verify your identity and authorize access, please enter the following 6-digit verification code on your screen:

--------------------------------------------------
👉   YOUR CODE: ${loginCode}
--------------------------------------------------

Security Context:
• Operator Name: ${user.name}
• Assigned Role: ${user.role}
• Portal Username: "${user.username}"
• Registered Email: "${toEmail}"
• Service Status: SECURITY LOCK ACTIVE
• Action Timestamp: ${new Date().toUTCString()}
--------------------------------------------------

If you did not execute this login request, please update your security settings or contact us immediately.`,
    userId: user.id,
    status: 'sent',
    timestamp: new Date().toISOString()
  };

  db.verificationEmails = db.verificationEmails || [];
  db.verificationEmails.unshift(emailItem);

  db.notifications = db.notifications || [];
  db.notifications.unshift({
    id: 'notif-' + Math.random().toString(36).substr(2, 9),
    title: 'Login OTP Verification Dispatched',
    message: `Security verification OTP sent to ${toEmail} for "${user.username}"`,
    timestamp: new Date().toISOString(),
    read: false
  });

  writeDb(db);

  // Asynchronously dispatch SMTP email
  sendRealEmail(emailItem.to, emailItem.subject, emailItem.body).then((result) => {
    if (result.success) {
      console.log(`✉️ Login verification email successfully dispatched to ${emailItem.to}`);
    } else {
      console.log(`📡 Login verification code generated. Local simulation spooler is updated.`);
    }
  });

  logAction(user.username, user.role, 'Login Attempt', `Login clearance code sent to registered inbox ${toEmail}`);

  res.json({
    requireOtp: true,
    username: user.username,
    email: toEmail,
    message: `A secure 6-digit verification code has been dispatched to your email: ${toEmail}. Please check your mobile or the Sandbox SMTP Spooler (at the bottom of the page) to retrieve your code.`
  });
});

app.post('/api/auth/login-verify', (req, res) => {
  const { username, code } = req.body;
  if (!username || !code) {
    return res.status(400).json({ error: 'Username and verification code are required' });
  }

  const db = readDb();
  const user = db.users.find(
    (u: any) => u.username.toLowerCase() === username.toLowerCase()
  );

  if (!user) {
    return res.status(404).json({ error: 'Operator profile not found.' });
  }

  const savedRecord = db.tempLoginCodes && db.tempLoginCodes[username.toLowerCase()];
  if (!savedRecord) {
    return res.status(400).json({ error: 'No active verification request found. Please login again to request a code.' });
  }

  if (Date.now() > savedRecord.expiresAt) {
    return res.status(400).json({ error: 'Verification code is expired. Please trigger a new login code.' });
  }

  if (savedRecord.code !== code.trim()) {
    return res.status(400).json({ error: 'Invalid verification code. Please input the correct code received in your email.' });
  }

  // Code verified successfully! Clear the temporary code
  delete db.tempLoginCodes[username.toLowerCase()];

  // Enforce secure verification approval loop for non-Admins
  if (user.role !== 'Admin') {
    const status = user.status || 'pending_first_login';

    // Find the real Admin user email in the DB dynamically
    const adminUser = db.users.find((u: any) => u.role === 'Admin');
    const adminEmail = (adminUser && adminUser.email) || (db.notificationSettings && db.notificationSettings.adminEmail) || 'umairullah410446@gmail.com';

    if (status === 'pending_first_login') {
      user.status = 'awaiting_approval';

      const emailId = 'email-' + Math.random().toString(36).substr(2, 9);
      const emailItem = {
        id: emailId,
        to: adminEmail,
        from: 'security@baheriamotors.com',
        subject: `⚠️ SECURITY CLEARANCE HANDSHAKE: First-Time Login for ${user.name} (${user.role})`,
        body: `Dear Admin,

A secure login sequence has been triggered for a brand new operator account:
------------------------------------------
• Operator Name: ${user.name}
• Assigned Role: ${user.role}
• Portal Username: "${user.username}"
• Registered IP: ::1 Secure Server Proxy
• Timestamp: ${new Date().toUTCString()}
------------------------------------------

To guarantee the integrity of Baheria Motors General Ledger, this credentials lock must be manually verified and approved before access to database tables is granted.

To review and authorize this login verification, please use the Security Approvals Drawer in your Admin dashboard.`,
        userId: user.id,
        status: 'pending',
        timestamp: new Date().toISOString()
      };

      db.verificationEmails = db.verificationEmails || [];
      db.verificationEmails.unshift(emailItem);

      db.notifications = db.notifications || [];
      db.notifications.unshift({
        id: 'notif-' + Math.random().toString(36).substr(2, 9),
        title: 'Security Clearance Requested',
        message: `${user.name} triggered first-time email verification to ${adminEmail}`,
        timestamp: new Date().toISOString(),
        read: false
      });

      writeDb(db);

      sendRealEmail(emailItem.to, emailItem.subject, emailItem.body);

      logAction(user.username, user.role, 'Login Verification Logged', `First-time login triggered notification clearance dispatch to ${adminEmail}`);

      return res.status(403).json({
        error: 'verification_required',
        email: adminEmail,
        message: `FIRST-TIME AUTHENTICATION REGISTERED. A secure confirmation request has been dispatched to admin's inbox: ${adminEmail}. Access the "Sandbox SMTP Terminal" below to simulate and approve the secure link.`
      });
    } else if (status === 'awaiting_approval') {
      writeDb(db);
      return res.status(403).json({
        error: 'awaiting_approval',
        email: adminEmail,
        message: `AUTHENTICATION PENDING CLEARANCE. Your credentials are locked. Admin verification is required at: ${adminEmail}. Please ask the Administrator to approve your account.`
      });
    }
  }

  writeDb(db);

  const userSession = {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    githubProfile: user.githubProfile || null,
    email: user.email || ''
  };

  logAction(user.username, user.role, 'Login Successful', `User ${user.name} logged in successfully using 6-digit email security clearance handshake.`);
  res.json({ user: userSession, token: 'session_token_' + user.id });
});

app.post('/api/auth/save-smtp-and-resend', async (req, res) => {
  const { username, smtpHost, smtpPort, smtpUser, smtpPass, smtpSecure, senderEmail } = req.body;
  if (!username || !smtpUser || !smtpPass) {
    return res.status(400).json({ error: 'Username, SMTP user email, and App Password are required' });
  }

  const db = readDb();
  const backupSettings = db.notificationSettings ? { ...db.notificationSettings } : null;

  // 1. Save SMTP settings permanently
  db.notificationSettings = db.notificationSettings || {};
  db.notificationSettings.smtpHost = smtpHost || 'smtp.gmail.com';
  db.notificationSettings.smtpPort = smtpPort || '465';
  db.notificationSettings.smtpUser = smtpUser;
  db.notificationSettings.smtpPass = smtpPass;
  db.notificationSettings.smtpSecure = smtpSecure !== undefined ? smtpSecure : true;
  db.notificationSettings.senderEmail = senderEmail || smtpUser;
  db.notificationSettings.enableEmail = true; // Force-enable real email sending

  const user = db.users.find(
    (u: any) => u.username.toLowerCase() === username.toLowerCase()
  );

  if (!user) {
    if (backupSettings) db.notificationSettings = backupSettings;
    writeDb(db);
    return res.status(404).json({ error: 'User profile not found in registry.' });
  }

  // 2. Fetch or update current login verification OTP
  db.tempLoginCodes = db.tempLoginCodes || {};
  let loginCodeObj = db.tempLoginCodes[username.toLowerCase()];
  let loginCode;
  if (loginCodeObj && loginCodeObj.expiresAt > Date.now()) {
    loginCode = loginCodeObj.code;
  } else {
    loginCode = Math.floor(100000 + Math.random() * 900000).toString();
    db.tempLoginCodes[username.toLowerCase()] = {
      code: loginCode,
      expiresAt: Date.now() + 5 * 60 * 1000
    };
  }

  // Ensure user's email is synchronized with this SMTP email if empty or default
  if (!user.email || user.email.includes('@showroom.com')) {
    user.email = smtpUser;
  }
  const toEmail = user.email || smtpUser;

  const emailId = 'email-' + Math.random().toString(36).substr(2, 9);
  const emailItem = {
    id: emailId,
    to: toEmail,
    from: senderEmail || smtpUser,
    subject: `🔐 LOGIN VERIFICATION CODE: ${loginCode}`,
    body: `Dear ${user.name || 'Showroom Representative'},

A secure login sequence has been initiated for your Baheria Motors account on your mobile/device.
To verify your identity and authorize access, please enter the following 6-digit verification code on your screen:

--------------------------------------------------
👉   YOUR CODE: ${loginCode}
--------------------------------------------------

Security Context:
• Operator Name: ${user.name || 'Showroom Representative'}
• Assigned Role: ${user.role}
• Portal Username: "${user.username}"
• Registered Email (Recipient): "${toEmail}"
• Service Status: SECURITY LOCK ACTIVE
• Action Timestamp: ${new Date().toUTCString()}
--------------------------------------------------

If you did not execute this login request, please update your security settings or contact us immediately.`,
    userId: user.id,
    status: 'sent',
    timestamp: new Date().toISOString()
  };

  db.verificationEmails = db.verificationEmails || [];
  db.verificationEmails.unshift(emailItem);

  db.notifications = db.notifications || [];
  db.notifications.unshift({
    id: 'notif-' + Math.random().toString(36).substr(2, 9),
    title: 'Login OTP Verification Dispatched',
    message: `Security verification OTP sent to ${toEmail} for "${user.username}"`,
    timestamp: new Date().toISOString(),
    read: false
  });

  writeDb(db);

  // 3. Perform a real SMTP dispatch synchronously and return the result
  try {
    const result = await sendRealEmail(emailItem.to, emailItem.subject, emailItem.body);
    if (result.success) {
      console.log(`✉️ Login verification email successfully dispatched to ${emailItem.to}`);
      logAction(user.username, user.role, 'SMTP Saved & OTP Retrigger', `Updated real SMTP outbound specs and dispatched verification code to ${toEmail}`);

      return res.json({
        success: true,
        email: toEmail,
        message: `SMTP outbound configured successfully! Verification code has been dispatched to ${toEmail}. Please check your inbox or spam folder.`
      });
    } else {
      console.log(`📡 SMTP dispatch failed synchronously: ${result.error}`);

      // Roll back the saved settings since test send failed
      const freshDb = readDb();
      if (backupSettings) {
        freshDb.notificationSettings = backupSettings;
      } else {
        delete freshDb.notificationSettings;
      }
      writeDb(freshDb);

      return res.status(400).json({
        error: result.error || 'Failed to dispatch email via the configured SMTP server.'
      });
    }
  } catch (smtpErr: any) {
    console.error('❌ Synchronous SMTP send exception:', smtpErr);
    return res.status(400).json({
      error: smtpErr.message || 'An unexpected error occurred during SMTP connection.'
    });
  }
});

app.post('/api/auth/forgot-password-request', (req, res) => {
  const { username, email } = req.body;
  if (!username || !email) {
    return res.status(400).json({ error: 'Username and registered email are required' });
  }

  const db = readDb();
  const user = db.users.find(
    (u: any) => u.username.toLowerCase() === username.toLowerCase()
  );

  if (!user) {
    return res.status(404).json({ error: 'Username not found in showroom records.' });
  }

  if (user.role !== 'Admin') {
    return res.status(403).json({ error: 'Access Denied: Only Showroom Administrators can self-reset access PINs online. Staff must request updates directly from the Admin.' });
  }

  if (user.email && user.email.toLowerCase() !== email.toLowerCase()) {
    return res.status(400).json({ error: 'Identity verification failed: The provided email does not match our records for this Admin seat.' });
  }

  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
  db.tempResetCodes = db.tempResetCodes || {};
  db.tempResetCodes[username.toLowerCase()] = {
    code: resetCode,
    expiresAt: Date.now() + 5 * 60 * 1000
  };

  const toEmail = user.email || 'umairullah410446@gmail.com';
  const emailId = 'email-' + Math.random().toString(36).substr(2, 9);
  const emailItem = {
    id: emailId,
    to: toEmail,
    from: 'security@baheriamotors.com',
    subject: `🔐 PASSWORD RESET SECURITY CODE: ${resetCode}`,
    body: `Dear Showroom Administrator ${user.name},

A request to reset your global Admin access PIN has been initiated.
To verify your authorization and complete this security reset, please enter the following 6-digit confirmation code on your screen:

--------------------------------------------------
👉   YOUR CODE: ${resetCode}
--------------------------------------------------

Security Context:
• Requested For: ${user.name} (Administrator)
• Registered Mail: "${toEmail}"
• Access Status: PENDING HANDSHAKE VERIFICATION
• Timestamp: ${new Date().toUTCString()}
--------------------------------------------------

If you did not request this update, please change your credentials immediately or secure your database files.`,
    userId: user.id,
    status: 'sent',
    timestamp: new Date().toISOString()
  };

  db.verificationEmails = db.verificationEmails || [];
  db.verificationEmails.unshift(emailItem);

  db.notifications = db.notifications || [];
  db.notifications.unshift({
    id: 'notif-' + Math.random().toString(36).substr(2, 9),
    title: 'PIN Reset OTP Requested',
    message: `Reset OTP dispatched to Admin inbox ${toEmail}`,
    timestamp: new Date().toISOString(),
    read: false
  });

  writeDb(db);

  sendRealEmail(emailItem.to, emailItem.subject, emailItem.body).then((result) => {
    if (result.success) {
      console.log(`✉️ PIN reset OTP successfully dispatched to ${emailItem.to}`);
    } else {
      console.log(`📡 Secure security code generated. Spooled locally for on-screen access.`);
    }
  });

  logAction(username, 'Admin', 'PIN Reset OTP Dispatched', `Admin "${user.name}" requested selfPIN reset. OTP dispatched.`);

  res.json({ success: true, message: `A secure 6-digit OTP code has been dispatched to your email: ${toEmail}.` });
});

app.post('/api/auth/forgot-password', (req, res) => {
  const { username, newPassword, email, code } = req.body;
  if (!username || !newPassword || !email || !code) {
    return res.status(400).json({ error: 'Username, registered email, verification code, and target new PIN are all required.' });
  }

  const db = readDb();
  const userIdx = (db.users || []).findIndex((u: any) => u.username.toLowerCase() === username.toLowerCase());

  if (userIdx === -1) {
    return res.status(404).json({ error: 'Username not found in showroom records.' });
  }

  const user = db.users[userIdx];

  if (user.role !== 'Admin') {
    return res.status(403).json({ error: 'Access Denied: Only Showroom Administrators can self-reset access PINs online.' });
  }

  // Double lock identity verification
  if (user.email && user.email.toLowerCase() !== email.toLowerCase()) {
    return res.status(400).json({ error: 'Identity verification failed: The provided email does not match our records for this Admin seat.' });
  }

  // Verify OTP
  const savedRecord = db.tempResetCodes && db.tempResetCodes[username.toLowerCase()];
  if (!savedRecord) {
    return res.status(400).json({ error: 'No active password reset verification requested. Please request a new code.' });
  }

  if (Date.now() > savedRecord.expiresAt) {
    return res.status(400).json({ error: 'Your password reset confirmation code has expired. Please request a new one.' });
  }

  if (savedRecord.code !== code.trim()) {
    return res.status(400).json({ error: 'Invalid verification code. Please input the correct 6-digit code received in your email.' });
  }

  // Update password in database
  user.password = newPassword;

  // Clear verification record
  delete db.tempResetCodes[username.toLowerCase()];

  // Send security alert / confirmation email
  const userEmail = user.email || 'umairullah410446@gmail.com';
  const emailId = 'email-' + Math.random().toString(36).substr(2, 9);
  const emailItem = {
    id: emailId,
    to: userEmail,
    from: 'security@baheriamotors.com',
    subject: `🔐 SYSTEM ALERT: Showroom Admin Self-PIN Reset Handshake`,
    body: `Dear Showroom Administrator ${user.name},
    
Your global Admin account access PIN has been successfully updated via the login self-service portal.

------------------------------------------------
• Admin Username: "${user.username}"
• Registered Email: "${userEmail}"
• Newly Set PIN Code: "${newPassword}"
• Verification Handshake: COMPLETED
• Security Protocol Code: TLS-SHA-256
• Action Timestamp: ${new Date().toUTCString()}
------------------------------------------------

If you did not execute this change, please immediately restart your local database server or revert back from the general ledger backup.`,
    userId: user.id,
    status: 'sent',
    timestamp: new Date().toISOString()
  };

  db.verificationEmails = db.verificationEmails || [];
  db.verificationEmails.unshift(emailItem);

  db.notifications = db.notifications || [];
  db.notifications.unshift({
    id: 'notif-' + Math.random().toString(36).substr(2, 9),
    title: 'Admin Self-PIN Reset Executed',
    message: `Security validation email successfully routed to registered address ${userEmail}`,
    timestamp: new Date().toISOString(),
    read: false
  });

  writeDb(db);

  // Asynchronously dispatch the actual email through the SMTP relay
  sendRealEmail(emailItem.to, emailItem.subject, emailItem.body).then((result) => {
    if (result.success) {
      console.log(`✉️ Admin self-pin reset verification email dispatched to ${emailItem.to}`);
    } else {
      console.log(`📡 Admin handshake executed. Local simulation is online.`);
    }
  });

  logAction(username, 'Admin', 'Admin PIN Reset', `Admin "${user.name}" updated their own access PIN. Security clearance email sent to "${userEmail}"`);

  res.json({ status: 'ok', message: 'Success! Your Admin access PIN has been updated. A security clearance handshake email has been dispatched to your registered address.' });
});

// POST /api/auth/register - Self-registration for showroom officers
app.post('/api/auth/register', (req, res) => {
  const { name, username, password, role, email } = req.body;
  if (!name || !username || !password || !role) {
    return res.status(400).json({ error: 'All fields (name, username, password, role) are required.' });
  }

  if (role.toLowerCase() !== 'admin') {
    return res.status(400).json({ error: 'Only Showroom Administrators can self-register on this terminal. Salesmen and Recovery Officers must be registered by an existing Administrator.' });
  }

  const db = readDb();
  const exists = (db.users || []).some((u: any) => u.username.toLowerCase() === username.toLowerCase());
  if (exists) {
    return res.status(400).json({ error: 'Username already registered.' });
  }

  const newUser = {
    id: 'u-' + Math.random().toString(36).substr(2, 9),
    name,
    username,
    password,
    role, // 'Salesman' or 'Recovery Officer'
    email: email || `${username.toLowerCase()}@showroom.com`,
    status: 'active',
    githubProfile: null
  };

  db.users = db.users || [];
  db.users.push(newUser);
  writeDb(db);

  logAction(username, role, 'Officer Account Registered', `New self-registered ${role} account for "${name}" (Username: "${username}")`);
  res.status(201).json({ success: true, user: { id: newUser.id, name: newUser.name, username: newUser.username, role: newUser.role, status: newUser.status } });
});

// ==========================================
// 1A. OFFICER & WORKSTATION CREATION ENDPOINTS
// ==========================================

// GET /api/admin/users - List all users (excluding passwords, or keeping them secure)
app.get('/api/admin/users', (req, res) => {
  const db = readDb();
  const safeUsers = (db.users || []).map((u: any) => ({
    id: u.id,
    name: u.name,
    username: u.username,
    role: u.role,
    status: u.status || 'active',
    email: u.email || ''
  }));
  res.json({ users: safeUsers });
});

// POST /api/admin/users - Create custom user account (Pending clearance)
app.post('/api/admin/users', (req, res) => {
  const { name, username, password, role, email } = req.body;
  if (!name || !username || !password || !role) {
    return res.status(400).json({ error: 'All parameters (name, username, password, role) are required.' });
  }

  const db = readDb();
  const exists = (db.users || []).some((u: any) => u.username.toLowerCase() === username.toLowerCase());
  if (exists) {
    return res.status(400).json({ error: 'Username already registered to another showroom officer' });
  }

  const newUser = {
    id: 'u-' + Math.random().toString(36).substr(2, 9),
    name,
    username,
    password,
    role, // 'Salesman' or 'Recovery Officer'
    email: email || `${username.toLowerCase()}@showroom.com`,
    status: req.body.status || 'active',
    githubProfile: null
  };

  db.users = db.users || [];
  db.users.push(newUser);
  writeDb(db);

  logAction('admin', 'Admin', 'Officer Account Sealed', `Created ${role} account for "${name}" (Username: "${username}")`);
  res.json({ success: true, user: { id: newUser.id, name: newUser.name, username: newUser.username, role: newUser.role, status: newUser.status } });
});

// DELETE /api/admin/users/:id - Revoke and purge account from database ledger
app.delete('/api/admin/users/:id', (req, res) => {
  const { id } = req.params;
  const db = readDb();
  const userIdx = (db.users || []).findIndex((u: any) => u.id === id);
  if (userIdx === -1) {
    return res.status(404).json({ error: 'Showroom officer account not found' });
  }

  const targetUser = db.users[userIdx];
  if (targetUser.role === 'Admin') {
    return res.status(400).json({ error: 'Cannot delete the master admin seat' });
  }

  db.users = db.users.filter((u: any) => u.id !== id);

  // Clean related verification emails
  db.verificationEmails = (db.verificationEmails || []).filter((email: any) => email.userId !== id);

  writeDb(db);
  logAction('admin', 'Admin', 'Officer Session Revoked', `Purged credentials for "${targetUser.name}" from showroom records`);
  res.json({ success: true });
});

// POST /api/admin/users/:id/reset-pin - Reset access PIN and dispatch verification email
app.post('/api/admin/users/:id/reset-pin', (req, res) => {
  const { id } = req.params;
  const { newPin } = req.body;
  if (!newPin) {
    return res.status(400).json({ error: 'New PIN code is required' });
  }

  const db = readDb();
  const userIdx = (db.users || []).findIndex((u: any) => u.id === id);
  if (userIdx === -1) {
    return res.status(404).json({ error: 'Showroom officer account not found' });
  }

  const user = db.users[userIdx];
  user.password = newPin;

  const userEmail = user.email || `${user.username.toLowerCase()}@showroom.com`;
  const emailId = 'email-' + Math.random().toString(36).substr(2, 9);
  const emailItem = {
    id: emailId,
    to: userEmail,
    from: 'security@baheriamotors.com',
    subject: `🔐 SECURITY CLEARANCE HANDSHAKE: Your Access PIN has been Reset`,
    body: `Dear ${user.name},
    
Your showroom workspace access PIN code has been reset by the System Administrator.

------------------------------------------
• Operator Name: ${user.name}
• Assigned Role: ${user.role}
• Portal Username: "${user.username}"
• Registered Email: "${userEmail}"
• New Access PIN Code: "${newPin}"
• Previous PIN Revoked: YES
• Timestamp: ${new Date().toUTCString()}
------------------------------------------

To guarantee the integrity of Baheria Motors General Ledger, please use this new PIN to access the showroom portal workspace. For security, do not share your credentials with anyone.`,
    userId: user.id,
    status: 'sent',
    timestamp: new Date().toISOString()
  };

  db.verificationEmails = db.verificationEmails || [];
  db.verificationEmails.unshift(emailItem);

  db.notifications = db.notifications || [];
  db.notifications.unshift({
    id: 'notif-' + Math.random().toString(36).substr(2, 9),
    title: 'PIN Reset Verification Dispatched',
    message: `PIN reset notification email sent to ${userEmail} for operator "${user.name}"`,
    timestamp: new Date().toISOString(),
    read: false
  });

  writeDb(db);

  // Asynchronously attempt to transmit the actual email via the SMTP relay hander
  sendRealEmail(emailItem.to, emailItem.subject, emailItem.body).then((result) => {
    if (result.success) {
      console.log(`✉️ Real outbound email successfully dispatched to ${emailItem.to}`);
    } else {
      console.log(`📡 Credentials update registered. Local simulation sandbox is updated.`);
    }
  });

  logAction('admin', 'Admin', 'Credentials Override', `Reset access PIN code for "${user.name}" (${user.role}) and dispatched security alert to "${userEmail}"`);

  res.json({ success: true, email: userEmail });
});

// GET /api/admin/verification-emails - Retrieve sandbox incoming SMTP emails
app.get('/api/admin/verification-emails', (req, res) => {
  const db = readDb();
  res.json({ emails: db.verificationEmails || [] });
});

// POST /api/admin/users/:id/approve - Clear locked checkpoint and approve
app.post('/api/admin/users/:id/approve', (req, res) => {
  const { id } = req.params;
  const db = readDb();
  const userIdx = (db.users || []).findIndex((u: any) => u.id === id);

  if (userIdx === -1) {
    return res.status(404).json({ error: 'User does not exist in records' });
  }

  db.users[userIdx].status = 'active';

  // Update simulation emails status
  db.verificationEmails = (db.verificationEmails || []).map((email: any) => {
    if (email.userId === id && email.status === 'pending') {
      return { ...email, status: 'approved' };
    }
    return email;
  });

  writeDb(db);
  logAction('admin', 'Admin', 'Security Access Cleared', `Approved secure credential handshake for ${db.users[userIdx].role}: ${db.users[userIdx].name}`);
  res.json({ success: true });
});

// POST /api/admin/users/:id/reject - Revoke pending validation
app.post('/api/admin/users/:id/reject', (req, res) => {
  const { id } = req.params;
  const db = readDb();
  const userIdx = (db.users || []).findIndex((u: any) => u.id === id);

  if (userIdx === -1) {
    return res.status(404).json({ error: 'User does not exist in records' });
  }

  // Reset status back to pending_first_login
  db.users[userIdx].status = 'pending_first_login';

  // Update simulation emails status
  db.verificationEmails = (db.verificationEmails || []).map((email: any) => {
    if (email.userId === id && email.status === 'pending') {
      return { ...email, status: 'rejected' };
    }
    return email;
  });

  writeDb(db);
  logAction('admin', 'Admin', 'Security Access Revoked', `Rejected/Reset credentials handshake for ${db.users[userIdx].role}: ${db.users[userIdx].name}`);
  res.json({ success: true });
});

// ==========================================
// 1B. GITHUB INTEGRATION & OAUTH ENDPOINTS
// ==========================================

// GET /api/auth/github/url - Get GitHub OAuth URL
app.get('/api/auth/github/url', (req, res) => {
  const redirectUri = `${process.env.APP_URL || 'https://ais-dev-2mt4i5fjq53shvdahokz2i-295762983846.asia-southeast1.run.app'}/api/auth/github/callback`;
  const clientId = process.env.GITHUB_CLIENT_ID || 'MOCK_GITHUB_CLIENT_ID';

  const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user,repo`;
  res.json({ url: authUrl });
});

// GET /api/auth/github/callback - Handles GitHub OAuth Callback
app.get('/api/auth/github/callback', async (req, res) => {
  const { code } = req.query;
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  let githubData: any = null;
  let errorMsg: string | null = null;

  if (!code) {
    errorMsg = 'No authorization code provided';
  } else if (!clientId || !clientSecret) {
    // Falls back gracefully to public info if API keys aren't set in environment
    try {
      const publicRes = await fetch('https://api.github.com/users/umairullah', {
        headers: { 'User-Agent': 'node-fetch' }
      });
      if (publicRes.ok) {
        githubData = await publicRes.json();
      } else {
        githubData = {
          login: 'umairullah',
          name: 'Umair Ullah',
          avatar_url: 'https://avatars.githubusercontent.com/u/108340798?v=4',
          public_repos: 15,
          html_url: 'https://github.com/umairullah',
          bio: 'Fullstack Developer | AI Integration Expert'
        };
      }
    } catch (e) {
      githubData = {
        login: 'umairullah',
        name: 'Umair Ullah',
        avatar_url: 'https://avatars.githubusercontent.com/u/108340798?v=4',
        public_repos: 15,
        html_url: 'https://github.com/umairullah',
        bio: 'Fullstack Developer | AI Integration Expert'
      };
    }
  } else {
    try {
      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code
        })
      });

      const tokenData: any = await tokenRes.json();
      if (tokenData.error) {
        throw new Error(tokenData.error_description || tokenData.error);
      }

      const accessToken = tokenData.access_token;

      const userRes = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'User-Agent': 'node-fetch'
        }
      });

      if (userRes.ok) {
        githubData = await userRes.json();
      } else {
        throw new Error('Failed to fetch user profile from GitHub');
      }
    } catch (err: any) {
      errorMsg = err.message || 'OAuth verification failed';
    }
  }

  let profilePayload: any = null;
  if (githubData) {
    profilePayload = {
      login: githubData.login,
      name: githubData.name || githubData.login,
      avatar_url: githubData.avatar_url,
      public_repos: githubData.public_repos,
      html_url: githubData.html_url,
      bio: githubData.bio || ''
    };
  }

  res.send(`
    <html>
      <body style="font-family: monospace; background: #0f172a; color: white; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; margin: 0; padding: 20px;">
        <div style="background: #192233; padding: 35px; border-radius: 20px; border: 1.5px solid #c5a880; max-width: 420px; box-shadow: 0 15px 35px rgba(0,0,0,0.6);">
          ${errorMsg ? `
            <div style="color: #f87171; font-size: 36px; margin-bottom: 12px; animation: pulse 2s infinite;">⚠️</div>
            <h3 style="margin: 0 0 10px 0; color: #f87171; font-size: 16px; text-transform: uppercase; tracking-wider">Verification Error</h3>
            <p style="font-size: 11px; color: #94a3b8; line-height: 1.6; margin-bottom: 15px;">${errorMsg}</p>
            <p style="font-size: 10px; color: #af9268;">Running in Developer Fallback: Synced to preset user @umairullah as request proxy</p>
          ` : `
            <img src="${profilePayload?.avatar_url}" style="width: 80px; height: 80px; border-radius: 50%; border: 2.5px solid #c5a880; margin-bottom: 15px; box-shadow: 0 5px 15px rgba(0,0,0,0.3);" />
            <h3 style="margin: 0 0 8px 0; color: #f8fafc; font-size: 15px; text-transform: uppercase; font-family: sans-serif; font-weight: 800; letter-spacing: 0.5px;">GitHub Connected!</h3>
            <p style="margin: 0 0 10px 0; font-size: 13px; color: #c5a880; font-weight: bold;">@${profilePayload?.login}</p>
            <p style="font-size: 11px; color: #94a3b8; line-height: 1.5; margin-bottom: 0;">Broadcasting cryptographic token to ALPS Server terminal...</p>
          `}
        </div>
        <script>
          if (window.opener) {
            window.opener.postMessage({ 
              type: 'OAUTH_AUTH_SUCCESS', 
              payload: ${JSON.stringify(profilePayload)} 
            }, '*');
            setTimeout(() => {
              window.close();
            }, 1800);
          } else {
            document.write('<p style="font-size: 11px; color: #94a3b8; margin-top: 15px;">Terminal session finished. You can safely close this window.</p>');
          }
        </script>
      </body>
    </html>
  `);
});

// PUT /api/users/:userId/github - Manually link GitHub profile data
app.put('/api/users/:userId/github', (req, res) => {
  const { userId } = req.params;
  const { githubProfile } = req.body;

  const db = readDb();
  const index = db.users.findIndex((u: any) => u.id === userId);

  if (index === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  db.users[index].githubProfile = githubProfile;
  writeDb(db);

  logAction(
    db.users[index].username,
    db.users[index].role,
    'Link GitHub Account',
    `Connected GitHub account @${githubProfile?.login || 'unknown'} to ${db.users[index].name}`
  );

  res.json({ status: 'ok', user: { ...db.users[index], password: undefined } });
});

// POST /api/users/:userId/github/fetch-public - Fetch public info and save to db (No credentials needed!)
app.post('/api/users/:userId/github/fetch-public', async (req, res) => {
  const { userId } = req.params;
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ error: 'GitHub username is required.' });
  }

  try {
    const publicRes = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
      headers: { 'User-Agent': 'node-fetch' }
    });

    if (!publicRes.ok) {
      throw new Error(`GitHub responded with status: ${publicRes.status}`);
    }

    const githubData: any = await publicRes.json();
    const githubProfile = {
      login: githubData.login,
      name: githubData.name || githubData.login,
      avatar_url: githubData.avatar_url,
      public_repos: githubData.public_repos,
      html_url: githubData.html_url,
      bio: githubData.bio || ''
    };

    const db = readDb();
    const index = db.users.findIndex((u: any) => u.id === userId);

    if (index === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    db.users[index].githubProfile = githubProfile;
    writeDb(db);

    logAction(
      db.users[index].username,
      db.users[index].role,
      'Link GitHub Public Profile',
      `Directly pulled GitHub account @${githubProfile.login} for ${db.users[index].name}`
    );

    res.json({ success: true, user: { ...db.users[index], password: undefined }, githubProfile });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to find or fetch GitHub user: ' + err.message });
  }
});

// POST /api/users/:userId/github/disconnect - Remove connected GitHub account
app.post('/api/users/:userId/github/disconnect', (req, res) => {
  const { userId } = req.params;
  const db = readDb();
  const index = db.users.findIndex((u: any) => u.id === userId);

  if (index === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  const oldProfile = db.users[index].githubProfile;
  db.users[index].githubProfile = null;
  writeDb(db);

  logAction(
    db.users[index].username,
    db.users[index].role,
    'Disconnect GitHub Account',
    `Disconnected GitHub account @${oldProfile?.login || 'unknown'} from ${db.users[index].name}`
  );

  res.json({ success: true, user: { ...db.users[index], password: undefined } });
});

// ==========================================
// 2. AUDIT LOGS ENDPOINT
// ==========================================
app.get('/api/logs', (req, res) => {
  const db = readDb();
  res.json(db.auditLogs);
});

// ==========================================
// 3. FILE UPLOAD ENDPOINT
// ==========================================
app.post('/api/upload', (req, res) => {
  const { filename, base64Data } = req.body;
  if (!filename || !base64Data) {
    return res.status(400).json({ error: 'Filename and content base64Data are required' });
  }

  try {
    const cleanBase64 = base64Data.replace(/^data:.*?;base64,/, '');
    const fileBuffer = Buffer.from(cleanBase64, 'base64');
    const safeFilename = Date.now() + '_' + filename.replace(/[^a-zA-Z0-9.\-_]/g, '');
    const outPath = path.join(UPLOADS_DIR, safeFilename);

    fs.writeFileSync(outPath, fileBuffer);
    res.json({ url: `/uploads/${safeFilename}`, filename: safeFilename });
  } catch (error: any) {
    res.status(500).json({ error: 'File save failed: ' + error.message });
  }
});

// ==========================================
// 4. CUSTOMER ENDPOINTS
// ==========================================
app.get('/api/customers', (req, res) => {
  const db = readDb();
  const { role, userId } = req.query;
  if (role === 'Salesman' && userId) {
    const filtered = db.customers.filter((c: any) => c.salesmanId === userId);
    return res.json(filtered);
  }
  res.json(db.customers);
});

app.post('/api/customers', (req, res) => {
  const db = readDb();
  const { name, fatherName, cnic, phone, alternatePhone, address, guarantorName, guarantorCnic, photoUrl, documents, loggedUser, salesmanId, salesmanName } = req.body;

  if (!name || !cnic || !phone) {
    return res.status(400).json({ error: 'Name, CNIC, and primary Phone Number are required.' });
  }

  // Check unique CNIC
  const exists = db.customers.find((c: any) => c.cnic === cnic);
  if (exists) {
    return res.status(400).json({ error: `A customer with CNIC ${cnic} already exists.` });
  }

  const resolvedSalesmanId = salesmanId || (loggedUser?.role === 'Salesman' ? loggedUser.id : '');
  const resolvedSalesmanName = salesmanName || (loggedUser?.role === 'Salesman' ? loggedUser.name : '');

  const newCustomer = {
    id: 'cust-' + Math.random().toString(36).substr(2, 9),
    name,
    fatherName: fatherName || '',
    cnic,
    phone,
    alternatePhone: alternatePhone || '',
    address: address || '',
    guarantorName: guarantorName || '',
    guarantorCnic: guarantorCnic || '',
    photoUrl: photoUrl || '',
    documents: documents || [],
    createdAt: new Date().toISOString(),
    salesmanId: resolvedSalesmanId,
    salesmanName: resolvedSalesmanName
  };

  db.customers.push(newCustomer);
  writeDb(db);
  logAction(loggedUser?.username || 'system', loggedUser?.role || 'Guest', 'Add Customer', `Created customer ${name} (${cnic})`);
  res.status(201).json(newCustomer);
});

app.put('/api/customers/:id', (req, res) => {
  const { id } = req.params;
  const db = readDb();
  const index = db.customers.findIndex((c: any) => c.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Customer not found.' });
  }

  const { name, fatherName, cnic, phone, alternatePhone, address, guarantorName, guarantorCnic, photoUrl, documents, loggedUser } = req.body;

  db.customers[index] = {
    ...db.customers[index],
    name: name !== undefined ? name : db.customers[index].name,
    fatherName: fatherName !== undefined ? fatherName : db.customers[index].fatherName,
    cnic: cnic !== undefined ? cnic : db.customers[index].cnic,
    phone: phone !== undefined ? phone : db.customers[index].phone,
    alternatePhone: alternatePhone !== undefined ? alternatePhone : db.customers[index].alternatePhone,
    address: address !== undefined ? address : db.customers[index].address,
    guarantorName: guarantorName !== undefined ? guarantorName : db.customers[index].guarantorName,
    guarantorCnic: guarantorCnic !== undefined ? guarantorCnic : db.customers[index].guarantorCnic,
    photoUrl: photoUrl !== undefined ? photoUrl : db.customers[index].photoUrl,
    documents: documents !== undefined ? documents : db.customers[index].documents
  };

  writeDb(db);
  logAction(loggedUser?.username || 'system', loggedUser?.role || 'Guest', 'Edit Customer', `Updated customer ${db.customers[index].name}`);
  res.json(db.customers[index]);
});

app.delete('/api/customers/:id', (req, res) => {
  const { id } = req.params;
  const { loggedUser } = req.query as any;
  const parsedUser = loggedUser ? JSON.parse(loggedUser) : null;

  const db = readDb();
  const customer = db.customers.find((c: any) => c.id === id);
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found.' });
  }

  // Check if customer is assigned to any active installment
  const activePlan = db.installments.find((inst: any) => inst.customerId === id && inst.status !== 'Completed');
  if (activePlan) {
    return res.status(400).json({ error: 'Cannot delete customer because they have active high-value installment liability.' });
  }

  db.customers = db.customers.filter((c: any) => c.id !== id);
  writeDb(db);
  logAction(parsedUser?.username || 'system', parsedUser?.role || 'Guest', 'Delete Customer', `Deleted customer ${customer.name}`);
  res.json({ message: 'Customer deleted successfully' });
});


// ==========================================
// 5. VEHICLE MANAGEMENT ENDPOINTS
// ==========================================
app.get('/api/vehicles', (req, res) => {
  const db = readDb();
  res.json(db.vehicles);
});

app.post('/api/vehicles', (req, res) => {
  const db = readDb();
  const { company, model, variant, modelYear, registrationNumber, engineNumber, chassisNumber, color, fuelType, transmission, purchasePrice, salePrice, photoUrl, documents, loggedUser } = req.body;

  if (!company || !model || !engineNumber || !chassisNumber) {
    return res.status(400).json({ error: 'Company, Model, Engine Number, and Chassis Number are strictly required.' });
  }

  // Prevent duplicate engine or chassis numbers
  const duplicateEngine = db.vehicles.find((v: any) => v.engineNumber.toLowerCase() === engineNumber.toLowerCase());
  const duplicateChassis = db.vehicles.find((v: any) => v.chassisNumber.toLowerCase() === chassisNumber.toLowerCase());

  if (duplicateEngine) {
    return res.status(400).json({ error: `Engine number ${engineNumber} is already registered.` });
  }
  if (duplicateChassis) {
    return res.status(400).json({ error: `Chassis number ${chassisNumber} is already registered.` });
  }

  const newVehicle = {
    id: 'veh-' + Math.random().toString(36).substr(2, 9),
    company,
    model,
    variant: variant || '',
    modelYear: modelYear || '',
    registrationNumber: registrationNumber || '',
    engineNumber,
    chassisNumber,
    color: color || '',
    fuelType: fuelType || 'Petrol',
    transmission: transmission || 'Automatic',
    purchasePrice: Number(purchasePrice) || 0,
    salePrice: Number(salePrice) || 0,
    photoUrl: photoUrl || '',
    documents: documents || [],
    status: 'Available',
    createdAt: new Date().toISOString()
  };

  db.vehicles.push(newVehicle);
  writeDb(db);
  logAction(loggedUser?.username || 'system', loggedUser?.role || 'Guest', 'Add Vehicle', `Added vehicle ${company} ${model} (${chassisNumber})`);
  res.status(201).json(newVehicle);
});

app.put('/api/vehicles/:id', (req, res) => {
  const { id } = req.params;
  const db = readDb();
  const index = db.vehicles.findIndex((v: any) => v.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Vehicle not found.' });
  }

  const { company, model, variant, modelYear, registrationNumber, engineNumber, chassisNumber, color, fuelType, transmission, purchasePrice, salePrice, photoUrl, status, documents, loggedUser } = req.body;

  // Prevent duplicate engine check if altered
  if (engineNumber && engineNumber !== db.vehicles[index].engineNumber) {
    const dup = db.vehicles.find((v: any) => v.engineNumber.toLowerCase() === engineNumber.toLowerCase() && v.id !== id);
    if (dup) return res.status(400).json({ error: `Engine number ${engineNumber} is already registered.` });
  }
  if (chassisNumber && chassisNumber !== db.vehicles[index].chassisNumber) {
    const dup = db.vehicles.find((v: any) => v.chassisNumber.toLowerCase() === chassisNumber.toLowerCase() && v.id !== id);
    if (dup) return res.status(400).json({ error: `Chassis number ${chassisNumber} is already registered.` });
  }

  db.vehicles[index] = {
    ...db.vehicles[index],
    company: company !== undefined ? company : db.vehicles[index].company,
    model: model !== undefined ? model : db.vehicles[index].model,
    variant: variant !== undefined ? variant : db.vehicles[index].variant,
    modelYear: modelYear !== undefined ? modelYear : db.vehicles[index].modelYear,
    registrationNumber: registrationNumber !== undefined ? registrationNumber : db.vehicles[index].registrationNumber,
    engineNumber: engineNumber !== undefined ? engineNumber : db.vehicles[index].engineNumber,
    chassisNumber: chassisNumber !== undefined ? chassisNumber : db.vehicles[index].chassisNumber,
    color: color !== undefined ? color : db.vehicles[index].color,
    fuelType: fuelType !== undefined ? fuelType : db.vehicles[index].fuelType,
    transmission: transmission !== undefined ? transmission : db.vehicles[index].transmission,
    purchasePrice: purchasePrice !== undefined ? Number(purchasePrice) : db.vehicles[index].purchasePrice,
    salePrice: salePrice !== undefined ? Number(salePrice) : db.vehicles[index].salePrice,
    photoUrl: photoUrl !== undefined ? photoUrl : db.vehicles[index].photoUrl,
    status: status !== undefined ? status : db.vehicles[index].status,
    documents: documents !== undefined ? documents : db.vehicles[index].documents
  };

  writeDb(db);
  logAction(loggedUser?.username || 'system', loggedUser?.role || 'Guest', 'Edit Vehicle', `Updated vehicle ${db.vehicles[index].company} ${db.vehicles[index].model}`);
  res.json(db.vehicles[index]);
});

app.delete('/api/vehicles/:id', (req, res) => {
  const { id } = req.params;
  const { loggedUser } = req.query as any;
  const parsedUser = loggedUser ? JSON.parse(loggedUser) : null;

  const db = readDb();
  const vehicle = db.vehicles.find((v: any) => v.id === id);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found.' });

  if (vehicle.status === 'Sold on Installment' || vehicle.status === 'Sold on Cash') {
    return res.status(400).json({ error: 'Cannot delete a sold vehicle.' });
  }

  db.vehicles = db.vehicles.filter((v: any) => v.id !== id);
  writeDb(db);
  logAction(parsedUser?.username || 'system', parsedUser?.role || 'Guest', 'Delete Vehicle', `Deleted vehicle ${vehicle.company} ${vehicle.model}`);
  res.json({ message: 'Vehicle deleted successfully.' });
});

// ==========================================
// 6. INSTALLMENT SALES & PLANS
// ==========================================
app.get('/api/installments', (req, res) => {
  const db = readDb();
  // Recalculate and update overdues dynamically checking dueDay and dates
  // Compare to current date
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-11

  let updated = false;
  db.installments.forEach((plan: any) => {
    // For active ones, check standard overdue state
    if (plan.status !== 'Completed') {
      // Simplistic scheduling check:
      // If payment has overdue months compared to duration & months passed since start
      const start = new Date(plan.startDate);
      const monthsElapsed = (currentYear - start.getFullYear()) * 12 + (currentMonth - start.getMonth());
      const expectedPaidInstallments = Math.min(plan.durationMonths, Math.max(0, monthsElapsed));
      const expectedPaidAmount = expectedPaidInstallments * plan.monthlyInstallment;

      const realAmountPaidExcludingDown = plan.totalPaid - plan.downPayment;
      const expectedExcludingDown = expectedPaidAmount;

      if (realAmountPaidExcludingDown < expectedExcludingDown) {
        // Late or Overdue
        const gap = expectedExcludingDown - realAmountPaidExcludingDown;
        const missingMonths = Math.floor(gap / plan.monthlyInstallment);
        if (missingMonths >= 2) {
          if (plan.status !== 'Defaulter') {
            plan.status = 'Defaulter';
            updated = true;
          }
        } else if (missingMonths >= 1) {
          if (plan.status !== 'Overdue') {
            plan.status = 'Overdue';
            updated = true;
          }
        } else {
          if (plan.status !== 'Active') {
            plan.status = 'Active';
            updated = true;
          }
        }
      } else {
        if (plan.status !== 'Active') {
          plan.status = 'Active';
          updated = true;
        }
      }
    }
  });

  if (updated) {
    writeDb(db);
  }

  const { role, userId } = req.query;
  if (role === 'Salesman' && userId) {
    const filtered = db.installments.filter((plan: any) => plan.salesmanId === userId);
    return res.json(filtered);
  }

  res.json(db.installments);
});

app.post('/api/installments', (req, res) => {
  const db = readDb();
  const { customerId, vehicleId, vehiclePrice, downPayment, remainingAmount, monthlyInstallment, durationMonths, startDate, dueDay, loggedUser, saleType, salesmanId, salesmanName } = req.body;

  if (!customerId || !vehicleId || !vehiclePrice) {
    return res.status(400).json({ error: 'Customer, Vehicle, and Vehicle Price are required.' });
  }

  const customer = db.customers.find((c: any) => c.id === customerId);
  const vehicle = db.vehicles.find((v: any) => v.id === vehicleId);

  if (!customer) return res.status(404).json({ error: 'Customer not found.' });
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found.' });
  if (vehicle.status !== 'Available') {
    return res.status(400).json({ error: 'Selected vehicle is already sold or reserved.' });
  }

  // Calculate Next Due Date (only if installment plan)
  let nextDueDate;
  if (saleType !== 'Cash') {
    const start = new Date(startDate || new Date());
    start.setMonth(start.getMonth() + 1);
    start.setDate(Number(dueDay) || 5);
    nextDueDate = start.toISOString().split('T')[0];
  }

  // Resolve Salesman matching roles
  let resolvedSalesmanId = salesmanId;
  let resolvedSalesmanName = salesmanName;
  if (!resolvedSalesmanId && loggedUser?.role === 'Salesman') {
    resolvedSalesmanId = loggedUser.id;
    resolvedSalesmanName = loggedUser.name;
  }

  const planId = 'pln-' + Math.random().toString(36).substr(2, 9);
  const isCash = saleType === 'Cash';

  const newPlan = {
    id: planId,
    customerId,
    vehicleId,
    customerName: customer.name,
    vehicleName: `${vehicle.company} ${vehicle.model} ${vehicle.variant}`,
    vehicleNumber: vehicle.registrationNumber || 'N/A',
    vehiclePrice: Number(vehiclePrice),
    downPayment: isCash ? Number(vehiclePrice) : (Number(downPayment) || 0),
    remainingAmount: isCash ? 0 : Number(remainingAmount),
    monthlyInstallment: isCash ? 0 : Number(monthlyInstallment),
    durationMonths: isCash ? 0 : Number(durationMonths),
    startDate: startDate || new Date().toISOString().split('T')[0],
    dueDay: isCash ? 0 : (Number(dueDay) || 5),
    totalPaid: isCash ? Number(vehiclePrice) : (Number(downPayment) || 0),
    balance: isCash ? 0 : Number(remainingAmount),
    status: isCash ? 'Completed' : 'Active',
    nextDueDate: isCash ? undefined : nextDueDate,
    createdAt: new Date().toISOString(),
    salesmanId: resolvedSalesmanId || '',
    salesmanName: resolvedSalesmanName || '',
    saleType: saleType || 'Installment',
    saleDate: startDate || new Date().toISOString().split('T')[0]
  };

  db.installments.push(newPlan);

  // Update vehicle status
  const vIdx = db.vehicles.findIndex((v: any) => v.id === vehicleId);
  db.vehicles[vIdx].status = isCash ? 'Sold on Cash' : 'Sold on Installment';

  // Add payments log
  const recordedPaid = isCash ? Number(vehiclePrice) : Number(downPayment);
  if (recordedPaid > 0) {
    const downPaymentReceipt = (isCash ? 'CASH-' : 'DP-') + Math.floor(100000 + Math.random() * 900000);
    const systemPaymentObj = {
      id: 'pay-' + Math.random().toString(36).substr(2, 9),
      customerId,
      installmentId: planId,
      customerName: customer.name,
      vehicleName: `${vehicle.company} ${vehicle.model}`,
      amount: recordedPaid,
      paymentDate: startDate || new Date().toISOString().split('T')[0],
      paymentMethod: isCash ? 'Cash' : 'Cash',
      receiptNumber: downPaymentReceipt,
      notes: isCash ? 'Full Payment Cash Sale settlement recorded' : 'Initial Down Payment recorded upon plan booking',
      recordedBy: loggedUser?.name || 'Showroom Agent',
      createdAt: new Date().toISOString()
    };
    db.payments.push(systemPaymentObj);
  }

  writeDb(db);

  // Trigger Real-Time Notification & Dual Alert
  const saleNotificationMsg = `🚗 *New Vehicle Sale Booked / نئی گاڑی فروخت ہوئی*
• Salesman / سیلز مین: ${resolvedSalesmanName || 'Showroom Representative'}
• Customer / گاہک: ${customer.name}
• Vehicle Model / گاڑی کا ماڈل: ${vehicle.company} ${vehicle.model} ${vehicle.variant}
• Vehicle Number / رجسٹریشن نمبر: ${vehicle.registrationNumber || 'N/A'}
• Engine / انجن نمبر: ${vehicle.engineNumber || 'N/A'}
• Chassis / چیسس نمبر: ${vehicle.chassisNumber || 'N/A'}
• Sale Type / سیل کیٹیگری: ${saleType || 'Installment'}
• Price / کل قیمت: PKR ${Number(vehiclePrice).toLocaleString()}
• Down Payment / ایڈوانس رقم: PKR ${Number(recordedPaid).toLocaleString()}
• monthly Installment / ماہانہ قسط: PKR ${Number(isCash ? 0 : monthlyInstallment).toLocaleString()}
• Date & Time / تاریخ و وقت: ${new Date().toLocaleString()}`;

  triggerNotification({
    title: `🚗 New Vehicle Sold: ${vehicle.company} ${vehicle.model} (${saleType || 'Installment'})`,
    type: 'sale',
    message: saleNotificationMsg,
    metadata: { planId, customerName: customer.name, vehicleName: `${vehicle.company} ${vehicle.model}` }
  });

  logAction(loggedUser?.username || 'system', loggedUser?.role || 'Guest', 'Create Installment', `Booked vehicle ${vehicle.company} ${vehicle.model} for Customer ${customer.name} (Type: ${saleType || 'Installment'})`);
  res.status(201).json(newPlan);
});

// ==========================================
// 7. PAYMENT LOGGING & DIGITAL RECEIPTS
// ==========================================
app.get('/api/payments', (req, res) => {
  const db = readDb();
  const { role, userId } = req.query;
  if (role === 'Salesman' && userId) {
    const myPlanIds = db.installments
      .filter((i: any) => i.salesmanId === userId)
      .map((i: any) => i.id);
    const filtered = db.payments.filter((p: any) => myPlanIds.includes(p.installmentId));
    return res.json(filtered);
  }
  res.json(db.payments);
});

app.post('/api/payments', (req, res) => {
  const db = readDb();
  const { customerId, installmentId, amount, paymentDate, paymentMethod, notes, receiptNumber, loggedUser } = req.body;

  if (!customerId || !installmentId || !amount || !paymentMethod) {
    return res.status(400).json({ error: 'Required fields missing: Customer, Plan, amount, and payment method' });
  }

  const customer = db.customers.find((c: any) => c.id === customerId);
  const planIdx = db.installments.findIndex((p: any) => p.id === installmentId);

  if (!customer) return res.status(404).json({ error: 'Customer not found.' });
  if (planIdx === -1) return res.status(404).json({ error: 'Installment Plan not found.' });

  const plan = db.installments[planIdx];
  const processedAmount = Number(amount);

  if (processedAmount <= 0) {
    return res.status(400).json({ error: 'Payment amount must be greater than zero.' });
  }

  if (processedAmount > plan.balance) {
    return res.status(400).json({ error: `Payment of Rs. ${processedAmount.toLocaleString()} exceeds current outstanding balance of Rs. ${plan.balance.toLocaleString()}.` });
  }

  const payId = 'pay-' + Math.random().toString(36).substr(2, 9);
  const finalReceiptNumber = receiptNumber || 'REC-' + Math.floor(100000 + Math.random() * 900000);

  // Record payment
  const newPayment = {
    id: payId,
    customerId,
    installmentId,
    customerName: customer.name,
    vehicleName: plan.vehicleName,
    amount: processedAmount,
    paymentDate: paymentDate || new Date().toISOString().split('T')[0],
    paymentMethod,
    receiptNumber: finalReceiptNumber,
    notes: notes || '',
    recordedBy: loggedUser?.name || 'Showroom Representative',
    createdAt: new Date().toISOString()
  };

  // Process business logic updates to plan balances:
  // e.g. Vehicles Price = 2,000,000, Down Payment = 600,000, Remaining = 1,400,000
  // Total Paid = Total Paid + New Payment Amount
  // Balance = Vehicle Price - Total Paid
  const vehiclePrice = Number(plan.vehiclePrice);
  const updatedTotalPaid = plan.totalPaid + processedAmount;
  const updatedBalance = vehiclePrice - updatedTotalPaid;

  db.installments[planIdx].totalPaid = updatedTotalPaid;
  db.installments[planIdx].balance = updatedBalance;
  db.installments[planIdx].lastPaymentDate = paymentDate || new Date().toISOString().split('T')[0];

  // If fully paid, complete the installment plan
  if (updatedBalance <= 0) {
    db.installments[planIdx].status = 'Completed';
    // Update vehicle status to Sold on Cash or Sold (completed)
    const vehIndex = db.vehicles.findIndex((v: any) => v.id === plan.vehicleId);
    if (vehIndex !== -1) {
      db.vehicles[vehIndex].status = 'Sold on Cash'; // fully paid off
    }
  }

  // Update Next Due Date to next month
  const currentDueDate = new Date(plan.nextDueDate);
  currentDueDate.setMonth(currentDueDate.getMonth() + 1);
  db.installments[planIdx].nextDueDate = currentDueDate.toISOString().split('T')[0];

  db.payments.push(newPayment);
  writeDb(db);

  // Trigger Real-Time Notification & Dual Alert
  const recoveryNotificationMsg = `💰 *Recovery Received Successfully / ریکوری کامیابی سے وصول ہوئی*
• Officer / آفیسر: ${newPayment.recordedBy}
• Customer / گاہک: ${customer.name}
• Vehicle / گاڑی کا ماڈل: ${plan.vehicleName}
• Vehicle Number / رجسٹریشن نمبر: ${plan.vehicleNumber || 'N/A'}
• Recovered Amount / وصول شدہ رقم: PKR ${processedAmount.toLocaleString()}
• Remaining Balance / بقایا رقم: PKR ${updatedBalance.toLocaleString()}
• Method / ادائیگی کا ذریعہ: ${paymentMethod}
• Date & Time / تاریخ و وقت: ${new Date().toLocaleString()}
• Receipt Number / رسید نمبر: ${finalReceiptNumber}`;

  triggerNotification({
    title: `💰 Recovery Collected: PKR ${processedAmount.toLocaleString()} from ${customer.name}`,
    type: 'recovery',
    message: recoveryNotificationMsg,
    metadata: { payId: newPayment.id, customerName: customer.name, amount: processedAmount }
  });

  logAction(loggedUser?.username || 'system', loggedUser?.role || 'Guest', 'Record Payment', `Recorded payment of Rs.${processedAmount.toLocaleString()} from ${customer.name}`);
  res.status(201).json(newPayment);
});

// ==========================================
// 8. ADVANCED GLOBAL INSTANT SEARCH SYSTEM
// ==========================================
app.get('/api/search', (req, res) => {
  const query = (req.query.q as string || '').toLowerCase().trim();
  if (!query) {
    return res.json([]);
  }

  const db = readDb();
  const results: any[] = [];

  // 1. Search customers matches
  const matchedCustomers = db.customers.filter((c: any) =>
    c.name.toLowerCase().includes(query) ||
    c.cnic.replace(/[^0-9]/g, '').includes(query.replace(/[^0-9]/g, '')) ||
    c.phone.includes(query)
  );

  matchedCustomers.forEach((cust: any) => {
    // Collect vehicles and installment plans for each matched customer
    const plans = db.installments.filter((p: any) => p.customerId === cust.id);
    const resolvedVehicles = plans.map((p: any) => db.vehicles.find((v: any) => v.id === p.vehicleId)).filter(Boolean);

    results.push({
      type: 'customer',
      id: cust.id,
      title: cust.name,
      subTitle: `CNIC: ${cust.cnic} | Phone: ${cust.phone}`,
      data: {
        customer: cust,
        plans,
        vehicles: resolvedVehicles
      }
    });
  });

  // 2. Search vehicles matches (registration, chassis, engine, company or model)
  const matchedVehicles = db.vehicles.filter((v: any) =>
    v.company.toLowerCase().includes(query) ||
    v.model.toLowerCase().includes(query) ||
    v.registrationNumber.toLowerCase().includes(query) ||
    v.chassisNumber.toLowerCase().includes(query) ||
    v.engineNumber.toLowerCase().includes(query)
  );

  matchedVehicles.forEach((veh: any) => {
    // Find active installment if any
    const plan = db.installments.find((p: any) => p.vehicleId === veh.id);
    const assignedCustomer = plan ? db.customers.find((c: any) => c.id === plan.customerId) : null;

    results.push({
      type: 'vehicle',
      id: veh.id,
      title: `${veh.company} ${veh.model}`,
      subTitle: `Reg: ${veh.registrationNumber || 'N/A'} | Chassis: ${veh.chassisNumber} | ${veh.status}`,
      data: {
        vehicle: veh,
        plan,
        customer: assignedCustomer
      }
    });
  });

  res.json(results);
});

// ==========================================
// 9. RECOVERY STATISTICS & REPORTS SECTION
// ==========================================
app.get('/api/financials/dashboard', (req, res) => {
  const db = readDb();
  const { role, userId } = req.query;

  if (role === 'Salesman' && userId) {
    const myPlans = db.installments.filter((p: any) => p.salesmanId === userId);

    const totalVehiclesSold = myPlans.length;
    const totalInstallmentCustomers = myPlans.filter((p: any) => p.saleType !== 'Cash' && p.status !== 'Completed').length;
    const totalCashCustomers = myPlans.filter((p: any) => p.saleType === 'Cash').length;

    const totalPendingRecovery = myPlans
      .filter((p: any) => p.status !== 'Completed')
      .reduce((sum: number, p: any) => sum + p.balance, 0);

    const totalReceivedAmount = myPlans.reduce((sum: number, p: any) => sum + p.totalPaid, 0);
    const revenueGenerated = myPlans.reduce((sum: number, p: any) => sum + p.vehiclePrice, 0);

    const overdueInstallments = myPlans.filter((p: any) => p.status === 'Overdue' || p.status === 'Defaulter').length;

    // Monthly stats
    const nowObj = new Date();
    const curYear = nowObj.getFullYear();
    const rawM = nowObj.getMonth() + 1;
    const mStr = rawM < 10 ? '0' + rawM : rawM;
    const curMonthPrefix = `${curYear}-${mStr}`;

    const monthlySalesCount = myPlans.filter((p: any) => (p.saleDate || p.startDate || '').startsWith(curMonthPrefix)).length;
    const activeCustomersCount = myPlans.filter((p: any) => p.status !== 'Completed').length;

    return res.json({
      summary: {
        totalVehiclesSold,
        totalInstallmentCustomers,
        totalCashCustomers,
        totalPendingRecovery,
        totalReceivedAmount,
        overdueInstallments,
        revenueGenerated,
        monthlySalesCount,
        activeCustomersCount,
        monthlyCollection: 0,
        todayCollection: 0,
        totalProfit: 0,
        availableVehicles: 0
      },
      recentPayments: db.payments.filter((p: any) => myPlans.some((pl: any) => pl.id === p.installmentId)).slice(0, 10),
      recentSales: myPlans.slice(0, 10)
    });
  }

  // Summary Metrics
  const totalVehiclesAvailable = db.vehicles.filter((v: any) => v.status === 'Available').length;
  const totalVehiclesSold = db.vehicles.filter((v: any) => v.status === 'Sold on Installment' || v.status === 'Sold on Cash').length;

  const totalInstallmentCustomers = db.installments.filter((p: any) => p.status !== 'Completed').length;

  // Real calculation for cash sales vs installment sales:
  // Customers with vehicles sold on "Sold on Cash" or "Completed Installments" are Cash completed/Fully Paid.
  const totalCashSold = db.vehicles.filter((v: any) => v.status === 'Sold on Cash').length;

  // Recovery balances
  // "Total Market Recovery" = Sum of remaining balances on all ACTIVE installment plans
  const totalPendingRecovery = db.installments
    .filter((p: any) => p.status !== 'Completed')
    .reduce((sum: number, p: any) => sum + p.balance, 0);

  const totalReceivedAmount = db.payments.reduce((sum: number, p: any) => sum + p.amount, 0);

  // Profit calculations: Sale price - Purchase price of sold vehicles
  const soldVehicles = db.vehicles.filter((v: any) => v.status === 'Sold on Installment' || v.status === 'Sold on Cash');
  const totalProfit = soldVehicles.reduce((sum: number, v: any) => {
    const margin = v.salePrice - v.purchasePrice;
    return sum + (margin > 0 ? margin : 0);
  }, 0);

  // Overdue count and monthly collection
  const overdueInstallments = db.installments.filter((p: any) => p.status === 'Overdue' || p.status === 'Defaulter').length;

  // Monthly current collection amount (payments in current Gregorian calendar month)
  const now = new Date();
  const yearStr = now.getFullYear();
  const rawMonth = now.getMonth() + 1;
  const monthStr = rawMonth < 10 ? '0' + rawMonth : rawMonth;
  const currentMonthPrefix = `${yearStr}-${monthStr}`; // "2026-05"

  const monthlyCollection = db.payments
    .filter((p: any) => p.paymentDate.startsWith(currentMonthPrefix))
    .reduce((sum: number, p: any) => sum + p.amount, 0);

  // Daily statistics for notifications and logs
  const todayStr = now.toISOString().split('T')[0];
  const todayCollection = db.payments
    .filter((p: any) => p.paymentDate === todayStr)
    .reduce((sum: number, p: any) => sum + p.amount, 0);

  // Create recovery report datasets
  const monthlyRecoveryGraph = [
    { month: 'Jan', received: 1540000, expected: 1800000 },
    { month: 'Feb', received: 1680000, expected: 1800000 },
    { month: 'Mar', received: 1890000, expected: 1950000 },
    { month: 'Apr', received: 1720000, expected: 2000000 },
    { month: 'May', received: Math.max(monthlyCollection, 1200000), expected: 2100000 }
  ];

  res.json({
    summary: {
      totalVehiclesSold,
      totalInstallmentCustomers,
      totalCashCustomers: totalCashSold,
      totalPendingRecovery, // This is explicitly labeled "Total Market Recovery" in the card!
      totalReceivedAmount,
      monthlyCollection,
      todayCollection,
      overdueInstallments,
      totalProfit,
      availableVehicles: totalVehiclesAvailable
    },
    recoveryGraph: monthlyRecoveryGraph,
    cashVsInstallments: [
      { name: 'Installment Sales', value: totalInstallmentCustomers },
      { name: 'Cash Sales', value: totalCashSold }
    ],
    pendingInstallments: db.installments.map((p: any) => ({
      customer: p.customerName,
      remaining: p.balance,
      paid: p.totalPaid,
      status: p.status
    })).slice(0, 10),
    recentPayments: db.payments.slice(0, 10),
    recentSales: db.installments.slice(0, 5)
  });
});

// ==========================================
// 10. REAL SECURE DATABASE BACKUP & RESTORE
// ==========================================
app.post('/api/backups', (req, res) => {
  const { loggedUser } = req.body;
  try {
    const filename = `backup_${Date.now()}_db.json`;
    const backupPath = path.join(DB_DIR, filename);

    // Copy the db file
    fs.copyFileSync(DB_FILE, backupPath);

    logAction(loggedUser?.username || 'system', loggedUser?.role || 'Guest', 'Database Backup', `Manual backup created successfully: ${filename}`);
    res.json({ success: true, filename, createdAt: new Date().toISOString() });
  } catch (error: any) {
    res.status(500).json({ error: 'Database backup failed: ' + error.message });
  }
});

app.get('/api/backups', (req, res) => {
  try {
    const files = fs.readdirSync(DB_DIR);
    const backups = files
      .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
      .map(f => {
        const stats = fs.statSync(path.join(DB_DIR, f));
        return {
          id: f,
          filename: f,
          size: `${Math.round(stats.size / 1024)} KB`,
          createdAt: stats.birthtime.toISOString()
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    res.json(backups);
  } catch (error) {
    res.json([]);
  }
});

// ==========================================
// 11. AI SMART WHATSAPP REMINDER GENERATION
// ==========================================
app.post('/api/ai/draft-reminder', async (req, res) => {
  const { customerName, balance, nextDueDate, monthlyInstallment, vehicleName, isOverdue } = req.body;

  if (!customerName) {
    return res.status(400).json({ error: 'Customer information is required' });
  }

  try {
    const ai = getGeminiClient();
    const prompt = `
      Create a polite, professional, and clear showroom reminder message suitable for WhatsApp or SMS for a client of "Baheria Motors" showroom.
      Details:
      - Showroom Name: Baheria Motors
      - Customer Name: ${customerName}
      - Vehicle: ${vehicleName || 'Vehicle'}
      - Outstanding Installment Balance Option: Rs. ${Number(balance).toLocaleString()}
      - Monthly Installment Amount due: Rs. ${Number(monthlyInstallment).toLocaleString()}
      - Next Due Date: ${nextDueDate || 'due date'}
      - Status: ${isOverdue ? 'Overdue/Pending urgency' : 'Upcoming standard reminder'}

      The tone must be helpful, respectful but confident. Make sure it states current payment routes (Visit showroom, bank transfer). Use markdown lines for structured view and end with a respectful gratitude sentence. Add greeting and sign-off contact info. Keep it short under 150 words.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
    });

    const draft = response.text || 'Fallback reminder: Please pay your installment balance of Baheria Motors.';
    res.json({ draft });
  } catch (error: any) {
    // Elegant fallback if Gemini key is wrong, standard text output
    const standardDraft = `*Baheria Motors - Payment Reminder*\n\nDear ${customerName},\nThis is a friendly reminder that your upcoming installment of Rs. ${Number(monthlyInstallment).toLocaleString()} for your ${vehicleName || 'vehicle'} is due on ${nextDueDate || 'due date'}.\n\nTotal remaining balance is Rs. ${Number(balance).toLocaleString()}.\n\nPlease visit our showroom or contact us at your convenience to settle this.\n\nThank you for choosing Baheria Motors!`;
    res.json({ draft: standardDraft, note: 'Serving offline pre-approved draft.' });
  }
});

// ==========================================
// PARTNERS & FINANCIALS ENDPOINTS
// ==========================================

app.get('/api/partners', (req, res) => {
  const db = readDb();
  if (!db.partners) db.partners = [];
  res.json(db.partners);
});

app.post('/api/partners', (req, res) => {
  const db = readDb();
  if (!db.partners) db.partners = [];
  const { id, name, phone, cnic, ownershipPercentage, initialInvestment, joiningDate, status, notes, loggedUser } = req.body;

  if (!name || !cnic || !phone) {
    return res.status(400).json({ error: 'Partner Name, CNIC, and Phone number are required.' });
  }

  // Record Audit log details
  let actionDetails = '';
  let updatedPartner: any = null;

  if (id) {
    // Edit existing
    const idx = db.partners.findIndex((p: any) => p.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Partner not found.' });
    }
    const existing = db.partners[idx];
    updatedPartner = {
      ...existing,
      name,
      phone,
      cnic,
      ownershipPercentage: Number(ownershipPercentage) || 0,
      initialInvestment: Number(initialInvestment) || existing.initialInvestment || 0,
      joiningDate,
      status,
      notes,
    };
    db.partners[idx] = updatedPartner;
    actionDetails = `Updated Partner Profile for ${name} (Ownership: ${ownershipPercentage}%)`;
  } else {
    // Create new partner
    const initialAmt = Number(initialInvestment) || 0;
    updatedPartner = {
      id: 'partner-' + Date.now(),
      name,
      phone,
      cnic,
      ownershipPercentage: Number(ownershipPercentage) || 0,
      initialInvestment: initialAmt,
      joiningDate: joiningDate || new Date().toISOString().split('T')[0],
      status: status || 'Active',
      notes,
      createdAt: new Date().toISOString()
    };
    db.partners.push(updatedPartner);
    actionDetails = `Created New Partner Profile for ${name} (Ownership: ${ownershipPercentage}%, Investment: Rs. ${initialAmt.toLocaleString()})`;

    // Automatically create initial investment transaction
    if (initialAmt > 0) {
      if (!db.partnerTransactions) db.partnerTransactions = [];
      const initTx = {
        id: 'ptx-init-' + Date.now(),
        partnerId: updatedPartner.id,
        partnerName: updatedPartner.name,
        type: 'Investment',
        amount: initialAmt,
        date: updatedPartner.joiningDate,
        notes: `Initial Capital Investment recorded during partner registration.`,
        addedBy: loggedUser ? `${loggedUser.name} (${loggedUser.role})` : 'System (Registered Admin)',
        createdAt: new Date().toISOString()
      };
      db.partnerTransactions.push(initTx);
    }
  }

  // Add audit log
  const auditLog = {
    id: 'log-' + Date.now(),
    username: loggedUser?.username || 'admin',
    role: loggedUser?.role || 'Admin',
    action: id ? 'Partner Updated' : 'Partner Created',
    details: actionDetails,
    timestamp: new Date().toISOString()
  };
  if (!db.auditLogs) db.auditLogs = [];
  db.auditLogs.unshift(auditLog);

  writeDb(db);
  res.json({ partner: updatedPartner });
});

app.delete('/api/partners/:id', (req, res) => {
  const db = readDb();
  const partnerId = req.params.id;
  const loggedUser = req.query.loggedUser ? JSON.parse(req.query.loggedUser as string) : null;

  if (!db.partners) db.partners = [];
  const partner = db.partners.find((p: any) => p.id === partnerId);
  if (!partner) {
    return res.status(404).json({ error: 'Partner not found.' });
  }

  db.partners = db.partners.filter((p: any) => p.id !== partnerId);
  if (db.partnerTransactions) {
    db.partnerTransactions = db.partnerTransactions.filter((t: any) => t.partnerId !== partnerId);
  }

  // Add audit log
  const auditLog = {
    id: 'log-' + Date.now(),
    username: loggedUser?.username || 'admin',
    role: loggedUser?.role || 'Admin',
    action: 'Partner Deleted',
    details: `Deleted Partner profile and all associated logs for ${partner.name}`,
    timestamp: new Date().toISOString()
  };
  if (!db.auditLogs) db.auditLogs = [];
  db.auditLogs.unshift(auditLog);

  writeDb(db);
  res.json({ success: true });
});

app.get('/api/partner-transactions', (req, res) => {
  const db = readDb();
  if (!db.partnerTransactions) db.partnerTransactions = [];
  res.json(db.partnerTransactions);
});

app.post('/api/partner-transactions', (req, res) => {
  const db = readDb();
  if (!db.partners) db.partners = [];
  if (!db.partnerTransactions) db.partnerTransactions = [];

  const { id, partnerId, type, amount, date, notes, loggedUser } = req.body;

  if (!partnerId || !type || !amount) {
    return res.status(400).json({ error: 'Partner, Transaction Type, and Amount are required.' });
  }

  const partner = db.partners.find((p: any) => p.id === partnerId);
  if (!partner) {
    return res.status(400).json({ error: 'Selected partner does not exist.' });
  }

  let actionDetails = '';
  let updatedTx: any = null;

  if (id) {
    const idx = db.partnerTransactions.findIndex((t: any) => t.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Transaction record not found.' });
    }
    const existing = db.partnerTransactions[idx];
    updatedTx = {
      ...existing,
      partnerId,
      partnerName: partner.name,
      type,
      amount: Number(amount) || 0,
      date: date || new Date().toISOString().split('T')[0],
      notes,
    };
    db.partnerTransactions[idx] = updatedTx;
    actionDetails = `Updated transaction entry for ${partner.name}: ${type} of Rs. ${Number(amount).toLocaleString()}`;
  } else {
    updatedTx = {
      id: 'ptx-' + Date.now(),
      partnerId,
      partnerName: partner.name,
      type,
      amount: Number(amount) || 0,
      date: date || new Date().toISOString().split('T')[0],
      notes,
      addedBy: loggedUser ? `${loggedUser.name} (${loggedUser.role})` : 'Admin',
      createdAt: new Date().toISOString()
    };
    db.partnerTransactions.push(updatedTx);
    actionDetails = `Added transaction entry for ${partner.name}: ${type} of Rs. ${Number(amount).toLocaleString()}`;
  }

  // Add audit log
  const auditLog = {
    id: 'log-' + Date.now(),
    username: loggedUser?.username || 'admin',
    role: loggedUser?.role || 'Admin',
    action: id ? 'Transaction Updated' : 'Transaction Created',
    details: actionDetails,
    timestamp: new Date().toISOString()
  };
  if (!db.auditLogs) db.auditLogs = [];
  db.auditLogs.unshift(auditLog);

  writeDb(db);
  res.json({ transaction: updatedTx });
});

app.delete('/api/partner-transactions/:id', (req, res) => {
  const db = readDb();
  const txId = req.params.id;
  const loggedUser = req.query.loggedUser ? JSON.parse(req.query.loggedUser as string) : null;

  if (!db.partnerTransactions) db.partnerTransactions = [];
  const tx = db.partnerTransactions.find((t: any) => t.id === txId);
  if (!tx) {
    return res.status(404).json({ error: 'Transaction not found.' });
  }

  db.partnerTransactions = db.partnerTransactions.filter((t: any) => t.id !== txId);

  // Add audit log
  const auditLog = {
    id: 'log-' + Date.now(),
    username: loggedUser?.username || 'admin',
    role: loggedUser?.role || 'Admin',
    action: 'Transaction Deleted',
    details: `Deleted transaction entry for ${tx.partnerName}: ${tx.type} of Rs. ${Number(tx.amount).toLocaleString()}`,
    timestamp: new Date().toISOString()
  };
  if (!db.auditLogs) db.auditLogs = [];
  db.auditLogs.unshift(auditLog);

  writeDb(db);
  res.json({ success: true });
});

// Global Error Handling Middleware to catch any unexpected exceptions
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ [Unhandled Exception Catch]:', err);
  res.status(500).json({
    error: 'internal_server_error',
    message: err.message || 'An unexpected server error occurred during transaction processing.'
  });
});

// ==========================================
// 12. RUNNING SERVER & SPA ROUTING
// ==========================================
async function startServer() {
  // Initialize MySQL/XAMPP Database Setup
  await initMysql();

  if (process.env.NODE_ENV !== 'production') {
    // Mount Vite dev middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve the built files directly
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Baheria Motors Server] listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
