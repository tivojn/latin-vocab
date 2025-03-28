const { readJsonFile, writeJsonFile, USERS_FILE } = require('../utils');

module.exports = (req, res) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username } = req.body;
  
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }
  
  const usersData = readJsonFile(USERS_FILE);
  
  if (!usersData) {
    return res.status(500).json({ error: 'Failed to read user data' });
  }
  
  // Check if user exists
  let user = usersData.users.find(u => u.username === username);
  
  // If user doesn't exist, create a new one
  if (!user) {
    user = {
      username,
      passwordHash: "tempHash", // In a real app, you'd hash a password
      chapterProgress: 1,
      vocabProgress: {}
    };
    
    usersData.users.push(user);
    
    if (!writeJsonFile(USERS_FILE, usersData)) {
      return res.status(500).json({ error: 'Failed to create user' });
    }
  }
  
  res.status(200).json({
    username: user.username,
    chapterProgress: user.chapterProgress
  });
};
