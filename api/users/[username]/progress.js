const { readJsonFile, USERS_FILE } = require('../../utils');

module.exports = (req, res) => {
  const { username } = req.query;
  
  const usersData = readJsonFile(USERS_FILE);
  
  if (!usersData) {
    return res.status(500).json({ error: 'Failed to read user data' });
  }
  
  const user = usersData.users.find(u => u.username === username);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  res.status(200).json({
    chapterProgress: user.chapterProgress,
    vocabProgress: user.vocabProgress
  });
};
