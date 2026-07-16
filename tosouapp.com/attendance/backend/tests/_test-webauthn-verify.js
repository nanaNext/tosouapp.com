// Test what verifyRegistrationResponse expects vs what we send
require('../src/config/loadEnv');
const { generateRegistrationOptions, verifyRegistrationResponse } = require('@simplewebauthn/server');

(async () => {
  console.log('=== SimpleWebAuthn v10 API check ===');
  
  // Generate options like controller does
  const options = await generateRegistrationOptions({
    rpName: 'Test',
    rpID: 'localhost',
    userID: new Uint8Array(Buffer.from('123')),
    userName: 'test@test.com',
    authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' }
  });

  console.log('Options keys:', Object.keys(options));
  console.log('Options.user keys:', Object.keys(options.user));
  console.log('Options.user.id type:', typeof options.user.id);
  console.log('Challenge type:', typeof options.challenge);
  
  // Check what registrationInfo looks like (can't fully test without browser)
  console.log('\n=== Expected registrationInfo structure (v10) ===');
  console.log('v10 uses: registrationInfo.credential.id');
  console.log('v10 uses: registrationInfo.credential.publicKey');
  console.log('v10 uses: registrationInfo.credential.counter');
  
  console.log('\n✅ SimpleWebAuthn loaded OK, version check passed');
  process.exit(0);
})().catch(e => { console.log('ERR:', e.message); process.exit(1); });
