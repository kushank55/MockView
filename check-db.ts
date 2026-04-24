import { db } from './src/lib/db';

async function main() {
  try {
    const users = await db.user.findMany();
    console.log('Database connected successfully!');
    console.log(`Found ${users.length} users.`);
    console.log(users);
  } catch (error) {
    console.error('Database connection failed:', error);
  } finally {
    await db.$disconnect();
  }
}

main();
