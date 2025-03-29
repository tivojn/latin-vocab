/**
 * Migration script to update users.json
 * Converts chapterProgress to stageProgress
 */

const fs = require('fs');
const path = require('path');

// Path to users.json
const USERS_FILE = path.join(__dirname, 'users.json');

// Function to read the file
function readJsonFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.error(`File does not exist: ${filePath}`);
      return null;
    }
    
    const data = fs.readFileSync(filePath, 'utf8');
    
    try {
      const jsonData = JSON.parse(data);
      return jsonData;
    } catch (parseError) {
      console.error(`Error parsing JSON from ${filePath}:`, parseError);
      return null;
    }
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return null;
  }
}

// Function to write the file
function writeJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`Error writing file ${filePath}:`, error);
    return false;
  }
}

// Main migration function
function migrateUsers() {
  console.log('Starting user data migration (chapterProgress → stageProgress)');
  
  // Read the current users.json file
  const usersData = readJsonFile(USERS_FILE);
  
  if (!usersData || !usersData.users) {
    console.error('Failed to read users.json or no users found');
    return false;
  }
  
  // Create a backup of the current file
  const backupPath = `${USERS_FILE}.backup-${Date.now()}`;
  if (writeJsonFile(backupPath, usersData)) {
    console.log(`Backup created at ${backupPath}`);
  } else {
    console.error('Failed to create backup, aborting migration');
    return false;
  }
  
  let migrationCount = 0;
  
  // Update each user record
  usersData.users.forEach(user => {
    if ('chapterProgress' in user && !('stageProgress' in user)) {
      // Migrate chapterProgress to stageProgress
      user.stageProgress = user.chapterProgress;
      delete user.chapterProgress;
      migrationCount++;
    }
  });
  
  // Write the updated data back to the file
  if (writeJsonFile(USERS_FILE, usersData)) {
    console.log(`Migration completed: ${migrationCount} user records updated`);
    return true;
  } else {
    console.error('Failed to write updated user data');
    return false;
  }
}

// Run the migration
migrateUsers();
