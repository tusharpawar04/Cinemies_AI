require('dotenv').config({ path: '../.env' });
const { sequelize } = require('../src/database/postgres');
require('../src/models'); // This loads all models and relationships

async function sync() {
  try {
    await sequelize.authenticate();
    console.log('Connected to PostgreSQL');
    
    // Force sync database - drops all existing tables and recreates them
    await sequelize.sync({ force: true });
    console.log('Database synced successfully! All tables recreated.');
    
    process.exit(0);
  } catch (error) {
    console.error('Error syncing database:', error);
    process.exit(1);
  }
}

sync();
