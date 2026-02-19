const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

async function runSeed() {
  const client = await pool.connect();
  
  try {
    console.log('🌱 Starting database seeding...');
    
    // Read seed file
    const seedPath = path.join(__dirname, '..', '..', 'database', 'seed.sql');
    const seed = fs.readFileSync(seedPath, 'utf8');
    
    // Execute seed
    await client.query(seed);
    
    console.log('✅ Database seeded successfully!');
    console.log('\n📋 Sample credentials:');
    console.log('   Graduate: kim.mingyu@example.com / password123');
    console.log('   Student: choi.seungmin@example.com / password123');
    console.log('   Company: hr@samsung.com / password123');
    console.log('   Admin: admin@jeonjutech.edu / password123');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run seed if called directly
if (require.main === module) {
  runSeed()
    .then(() => {
      console.log('🎉 Seeding completed!');
      process.exit(0);
    })
    .catch(err => {
      console.error('Seeding error:', err);
      process.exit(1);
    });
}

module.exports = runSeed;
