const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL;

async function addOtpColumns() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Check current columns
    const checkRes = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'User' AND column_name IN ('resetOtpCode', 'resetOtpExpires')
    `);
    
    console.log('Current OTP columns found:', checkRes.rows);

    if (checkRes.rows.length < 2) {
      console.log('⏳ Adding missing OTP columns...');

      await client.query(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "resetOtpCode" TEXT;`);
      console.log('✅ resetOtpCode column added');

      await client.query(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "resetOtpExpires" TIMESTAMPTZ;`);
      console.log('✅ resetOtpExpires column added');
    } else {
      console.log('✅ Both OTP columns already exist!');
    }

    // Verify
    const verifyRes = await client.query(`
      SELECT column_name, data_type FROM information_schema.columns 
      WHERE table_name = 'User' AND column_name IN ('resetOtpCode', 'resetOtpExpires')
    `);
    console.log('📋 Verified columns in DB:', verifyRes.rows);

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
    console.log('🔒 Connection closed');
  }
}

addOtpColumns();
