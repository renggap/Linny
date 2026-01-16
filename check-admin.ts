import { getDatabase } from './server/database.ts';
import { compare } from 'bcrypt';

const db = await getDatabase();
const admin = await db.getUserByEmail('rengga@neodigital.co.id');

if (admin) {
  console.log('✅ Admin found!');
  console.log('Email:', admin.email);
  console.log('Stored hash:', admin.password_hash.substring(0, 30) + '...');

  // Test password verification
  const testPassword = 'Pen16paght!';
  const isValid = await compare(testPassword, admin.password_hash);
  console.log('\nPassword "Pen16paght!" valid:', isValid);

  if (!isValid) {
    // Try the default password
    const defaultValid = await compare('password123', admin.password_hash);
    console.log('Password "password123" valid:', defaultValid);
  }
} else {
  console.log('❌ Admin not found!');
}
