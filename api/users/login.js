
const fs = require('fs').promises;
const path = require('path');

const USERS_FILE = path.join(__dirname, '..', '..', 'users.json');

async function readJsonFile(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return null;
  }
}

async function writeJsonFile(filePath, data) {
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error);
    return false;
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'Username is required' });

  const usersData = await readJsonFile(USERS_FILE);
  if (!usersData) return res.status(500).json({ error: 'Failed to read user data' });

  let user = usersData.users.find(u => u.username === username);
  if (!user) {
    user = { username, passwordHash: "tempHash", chapterProgress: 1, vocabProgress: {} };
    usersData.users.push(user);
    if (!await writeJsonFile(USERS_FILE, usersData)) {
      return res.status(500).json({ error: 'Failed to create user' });
    }
  }

  res.status(200).json({ username: user.username, chapterProgress: user.chapterProgress });
};
