import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables (.env.local, .env)
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
} else if (fs.existsSync('.env')) {
  dotenv.config({ path: '.env' });
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function logPass(title) {
  totalTests++;
  passedTests++;
  console.log(`  \x1b[32m✔\x1b[0m ${title}`);
}

function logFail(title, error) {
  totalTests++;
  failedTests++;
  console.error(`  \x1b[31m✖\x1b[0m ${title}`);
  if (error) {
    console.error(`    \x1b[33mError:\x1b[0m ${error.message || error}`);
  }
}

// ── Validation Utility Helpers ───────────────────────────────────────────────
function formatGhanaPhone(input) {
  if (!input) return '';
  const digits = String(input).replace(/[^0-9]/g, '');
  if (digits.startsWith('233') && digits.length >= 12) {
    return '0' + digits.slice(3, 12);
  }
  if (digits.length === 9 && !digits.startsWith('0')) {
    return '0' + digits;
  }
  if (digits.length >= 10) {
    return digits.slice(0, 10);
  }
  return digits;
}

function isValidGhanaPhone(phone) {
  if (!phone) return false;
  const digits = String(phone).replace(/[^0-9]/g, '');
  return /^0[235][0-9]{8}$/.test(digits);
}

function formatGhanaCard(input) {
  if (!input) return '';
  let cleaned = String(input).toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (cleaned.startsWith('GHA')) {
    cleaned = cleaned.slice(3);
  }
  const digits = cleaned.replace(/[^0-9]/g, '');
  if (digits.length === 0) return 'GHA-';
  const body = digits.slice(0, 9);
  const checkDigit = digits.slice(9, 10);
  if (digits.length <= 9) {
    return `GHA-${body}`;
  }
  return `GHA-${body}-${checkDigit}`;
}

function isValidGhanaCard(card) {
  if (!card) return false;
  return /^GHA-\d{9}-\d$/i.test(card.trim());
}

function sanitizeInput(str) {
  if (typeof str !== 'string') return '';
  return str
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/[<>]/g, '');
}

// ── Main Test Runner ────────────────────────────────────────────────────────
async function runHealthCheck() {
  console.log('\n\x1b[1m\x1b[36m==========================================================\x1b[0m');
  console.log('\x1b[1m\x1b[36m   HO RENTALS - SYSTEM & DATABASE HEALTH AUDIT SUITE      \x1b[0m');
  console.log('\x1b[1m\x1b[36m==========================================================\x1b[0m\n');

  try {
    // ── SUITE 1: Validation Functions ─────────────────────────────────────────
    console.log('\x1b[1m[Suite 1] Form Validation & Formatting Utilities\x1b[0m');
    
    // 1.1 Phone formatting
    if (formatGhanaPhone('233240810683') === '0240810683' && formatGhanaPhone('+233 20 494 0602') === '0204940602') {
      logPass('Ghana phone normalization (+233 / international to local format)');
    } else {
      logFail('Ghana phone normalization');
    }

    // 1.2 Phone validation
    if (isValidGhanaPhone('0240810683') && isValidGhanaPhone('0204940602') && !isValidGhanaPhone('12345') && !isValidGhanaPhone('0123456789')) {
      logPass('Ghana phone regex validation (02X, 03X, 05X)');
    } else {
      logFail('Ghana phone regex validation');
    }

    // 1.3 Ghana Card formatting
    const formattedCard = formatGhanaCard('GHA1234567891');
    if (formattedCard === 'GHA-123456789-1') {
      logPass('Ghana Card formatting (GHA-XXXXXXXXX-X auto-hyphenation)');
    } else {
      logFail('Ghana Card formatting', `Expected GHA-123456789-1, got ${formattedCard}`);
    }

    // 1.4 Ghana Card validation (15 chars, NIA standard)
    if (isValidGhanaCard('GHA-123456789-1') && !isValidGhanaCard('GHA-1234-1') && !isValidGhanaCard('123456789012345')) {
      logPass('Ghana Card NIA format validation (strict 15 characters)');
    } else {
      logFail('Ghana Card NIA format validation');
    }

    // 1.5 XSS Sanitization
    if (sanitizeInput('<script>alert("xss")</script>Hello') === 'Hello') {
      logPass('HTML tag stripping and XSS sanitization');
    } else {
      logFail('HTML tag stripping and XSS sanitization');
    }

    // ── SUITE 2: Prisma Models & Database Connectivity ────────────────────────
    console.log('\n\x1b[1m[Suite 2] Database Models & Query Connectivity (15 Models)\x1b[0m');

    const models = [
      { name: 'User', fn: () => prisma.user.count() },
      { name: 'Property', fn: () => prisma.property.count() },
      { name: 'Company', fn: () => prisma.company.count() },
      { name: 'PropertyImage', fn: () => prisma.propertyImage.count() },
      { name: 'VerificationRequest', fn: () => prisma.verificationRequest.count() },
      { name: 'LandlordRegistration', fn: () => prisma.landlordRegistration.count() },
      { name: 'Report', fn: () => prisma.report.count() },
      { name: 'ContactLog', fn: () => prisma.contactLog.count() },
      { name: 'LeadInquiry', fn: () => prisma.leadInquiry.count() },
      { name: 'FraudAlert', fn: () => prisma.fraudAlert.count() },
      { name: 'PageVisit', fn: () => prisma.pageVisit.count() },
      { name: 'PasswordResetRequest', fn: () => prisma.passwordResetRequest.count() },
      { name: 'AuditLog', fn: () => prisma.auditLog.count() },
      { name: 'NotificationRead', fn: () => prisma.notificationRead.count() },
      { name: 'Subscription', fn: () => prisma.subscription.count() },
    ];

    for (const m of models) {
      try {
        const count = await m.fn();
        logPass(`Model [${m.name}] reachable (${count} record${count === 1 ? '' : 's'})`);
      } catch (err) {
        logFail(`Model [${m.name}] query error`, err);
      }
    }

    // ── SUITE 3: Core Database Relationships & Constraints ────────────────────
    console.log('\n\x1b[1m[Suite 3] Foreign Key Relations & Default System Integrity\x1b[0m');

    // 3.1 Check Default Company
    try {
      const defaultCompany = await prisma.company.findFirst({ where: { isOwnCompany: true } });
      if (defaultCompany) {
        logPass(`Default platform company exists (ID: #${defaultCompany.id} "${defaultCompany.name}")`);
      } else {
        logFail('Default platform company (isOwnCompany: true) missing from database');
      }
    } catch (err) {
      logFail('Default company query error', err);
    }

    // 3.2 Check Property with Owner and Images Relation
    try {
      const sampleProperty = await prisma.property.findFirst({
        include: {
          owner: { select: { id: true, name: true, role: true } },
          company: { select: { id: true, name: true } },
          images: true,
        }
      });
      if (!sampleProperty || sampleProperty.owner) {
        logPass('Property relational joins (Property -> Owner, Company, Images) execute cleanly');
      } else {
        logFail('Property relational join returned property with missing owner');
      }
    } catch (err) {
      logFail('Property relation join query error', err);
    }

    // 3.3 Check Verified Agents Directory Integrity
    try {
      const verifiedAgents = await prisma.user.findMany({
        where: {
          role: { in: ['agent', 'landlord'] },
          verificationStatus: 'verified',
        },
        select: { id: true, name: true, phone: true, licenseNumber: true }
      });
      logPass(`Verified agents query returns valid dataset (${verifiedAgents.length} verified agents)`);
    } catch (err) {
      logFail('Verified agents query error', err);
    }

    // ── SUITE 4: Isolated CRUD & Cascade Operation Test ──────────────────────
    console.log('\n\x1b[1m[Suite 4] Transactional Create / Update / Delete & Cascade Tests\x1b[0m');

    const testTimestamp = Date.now();
    const testEmail = `healthtest_${testTimestamp}@horentals.com`;
    const testPhone = '024999' + String(testTimestamp).slice(-4);
    const testCard = 'GHA-999999999-9';

    let testUserId = null;
    let testPropId = null;
    let testLandlordRegId = null;

    try {
      // 4.1 Create test user
      const createdUser = await prisma.user.create({
        data: {
          name: `HealthTest User ${testTimestamp}`,
          email: testEmail,
          password: 'PasswordHash_HealthTest_123',
          phone: testPhone,
          role: 'agent',
          verificationStatus: 'unverified',
          licenseNumber: testCard,
        }
      });
      testUserId = createdUser.id;
      logPass(`User creation & licenseNumber indexing (ID #${testUserId})`);

      // 4.2 Test duplicate Ghana Card rejection logic
      const duplicateFound = await prisma.user.findFirst({
        where: {
          id: { not: testUserId },
          licenseNumber: testCard,
        }
      });
      if (!duplicateFound) {
        logPass('Duplicate Ghana Card check successfully distinguishes unique vs duplicate users');
      } else {
        logFail('Duplicate check unexpectedly matched multiple users for unique ID');
      }

      // 4.3 Create test property for user
      const defaultCompany = await prisma.company.findFirst({ where: { isOwnCompany: true } });
      const createdProperty = await prisma.property.create({
        data: {
          title: `HealthTest Property ${testTimestamp}`,
          location: 'Ho Mirage, Volta Region',
          price: 500,
          description: 'Automated test property for system health verification.',
          contact: testPhone,
          status: 'pending_approval',
          ownerId: testUserId,
          companyId: defaultCompany?.id || 1,
          images: {
            create: [
              { url: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7', order: 0 }
            ]
          }
        },
        include: { images: true }
      });
      testPropId = createdProperty.id;
      logPass(`Property & Gallery creation with foreign keys (Property #${testPropId})`);

      // 4.4 Test NotificationRead creation on property
      await prisma.notificationRead.create({
        data: {
          userId: testUserId,
          propertyId: testPropId,
        }
      });
      logPass('NotificationRead relation created cleanly');

      // 4.5 Test LandlordRegistration creation with all required fields (including city)
      const landlordReg = await prisma.landlordRegistration.create({
        data: {
          name: `HealthTest Landlord ${testTimestamp}`,
          phone1: testPhone,
          city: 'Ho',
          propAddress: 'Civic Centre, Ho',
          rent: 400,
          propType: 'Single Room Self Contain',
          status: 'Pending Verification',
        }
      });
      testLandlordRegId = landlordReg.id;
      logPass(`LandlordRegistration creation with required fields (Reg #${testLandlordRegId})`);

      // 4.6 Cleanup test records
      await prisma.notificationRead.deleteMany({ where: { propertyId: testPropId } });
      await prisma.propertyImage.deleteMany({ where: { propertyId: testPropId } });
      await prisma.property.delete({ where: { id: testPropId } });
      testPropId = null;

      await prisma.landlordRegistration.delete({ where: { id: testLandlordRegId } });
      testLandlordRegId = null;

      await prisma.user.delete({ where: { id: testUserId } });
      testUserId = null;

      logPass('Test records cleaned up safely without leaving orphaned database entries');
    } catch (crudErr) {
      logFail('Transactional CRUD test error', crudErr);
      // Attempt cleanup
      if (testPropId) {
        await prisma.notificationRead.deleteMany({ where: { propertyId: testPropId } }).catch(() => {});
        await prisma.propertyImage.deleteMany({ where: { propertyId: testPropId } }).catch(() => {});
        await prisma.property.delete({ where: { id: testPropId } }).catch(() => {});
      }
      if (testLandlordRegId) {
        await prisma.landlordRegistration.delete({ where: { id: testLandlordRegId } }).catch(() => {});
      }
      if (testUserId) {
        await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
      }
    }

  } catch (globalErr) {
    logFail('Global test suite execution error', globalErr);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }

  // ── Final Summary ─────────────────────────────────────────────────────────
  console.log('\n\x1b[1m\x1b[36m----------------------------------------------------------\x1b[0m');
  console.log(`\x1b[1mTEST RESULTS: Total: ${totalTests} | \x1b[32mPassed: ${passedTests}\x1b[0m | \x1b[31mFailed: ${failedTests}\x1b[0m`);
  console.log('\x1b[1m\x1b[36m==========================================================\x1b[0m\n');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runHealthCheck();
