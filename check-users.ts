import { getDatabase } from './server/database.ts';

const db = await getDatabase();
const users = await db.getAllUsers();
console.log('Total users:', users.length);
console.log('\nAll users:');
users.forEach(u => console.log(`  - ${u.name} (${u.email}) [${u.role}]`));
