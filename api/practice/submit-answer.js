const { readJsonFile, writeJsonFile, VOCABULARY_FILES, DEFAULT_BOOK, USERS_FILE } = require('../utils');

// Initialize global tracker if it doesn't exist
if (typeof global.usedWordsTracker === 'undefined') {
  global.usedWordsTracker = {};
}

module.exports = (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, latinWord, userAnswer, format, book } = req.body;
  
  if (!username || !latinWord || !userAnswer) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  // Read files
  const vocabularyFile = VOCABULARY_FILES[book || DEFAULT_BOOK];
  const vocabularyData = readJsonFile(vocabularyFile);
  const usersData = readJsonFile(USERS_FILE);
  
  if (!vocabularyData || !usersData) {
    return res.status(500).json({ error: 'Failed to read data files' });
  }
  
  // Find the correct word and answer
  let correctWord = null;
  
  for (const chapter of vocabularyData.chapters) {
    const foundWord = chapter.words.find(word => word.latin === latinWord);
    if (foundWord) {
      correctWord = foundWord;
      break;
    }
  }
  
  if (!correctWord) {
    return res.status(404).json({ error: 'Word not found' });
  }
  
  // Find user
  const userIndex = usersData.users.findIndex(user => user.username === username);
  
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  // Check answer correctness
  let isCorrect = false;
  
  if (format === 'fill-in-the-blank') {
    // For fill-in-the-blank, do a more flexible check (case-insensitive and ignore extra spaces)
    const normalizedUserAnswer = userAnswer.trim().toLowerCase();
    const normalizedCorrectEnglish = correctWord.english.trim().toLowerCase();
    const normalizedCorrectLatin = correctWord.latin.trim().toLowerCase();
    
    // Main exact matches
    isCorrect = (
      normalizedUserAnswer === normalizedCorrectEnglish || 
      normalizedUserAnswer === normalizedCorrectLatin
    );
    
    // If not correct, try partial matching for fill-in-the-blank
    if (!isCorrect) {
      // Check if the user's answer is a significant part of the correct answer
      // This handles cases where the user might have slightly different capitalization or punctuation
      if (normalizedUserAnswer.length > 2) { // Only for answers with at least 3 characters to avoid false positives
        if (normalizedCorrectEnglish.includes(normalizedUserAnswer) ||
            normalizedCorrectLatin.includes(normalizedUserAnswer)) {
          // If the user answer is at least 80% of the length of the correct answer, count it correct
          const englishMatch = normalizedUserAnswer.length >= normalizedCorrectEnglish.length * 0.8;
          const latinMatch = normalizedUserAnswer.length >= normalizedCorrectLatin.length * 0.8;
          
          isCorrect = englishMatch || latinMatch;
        }
      }
    }
  } else {
    // For multiple choice, check exact match
    isCorrect = (
      userAnswer === correctWord.english || 
      userAnswer === correctWord.latin
    );
  }
  
  // Update user progress
  if (!usersData.users[userIndex].vocabProgress[latinWord]) {
    usersData.users[userIndex].vocabProgress[latinWord] = {
      correctCount: 0,
      incorrectCount: 0
    };
  }
  
  // Initialize tracker for this user if it doesn't exist yet
  if (!global.usedWordsTracker) {
    global.usedWordsTracker = {};
  }
  
  if (!global.usedWordsTracker[username]) {
    global.usedWordsTracker[username] = {
      wordHistory: [],
      incorrectWords: new Set()
    };
  }
  
  if (isCorrect) {
    usersData.users[userIndex].vocabProgress[latinWord].correctCount += 1;
    // If the word was in the incorrect set, remove it
    if (global.usedWordsTracker[username].incorrectWords) {
      global.usedWordsTracker[username].incorrectWords.delete(latinWord);
    }
  } else {
    usersData.users[userIndex].vocabProgress[latinWord].incorrectCount += 1;
    // Add to incorrect words to retry later
    if (global.usedWordsTracker[username].incorrectWords) {
      global.usedWordsTracker[username].incorrectWords.add(latinWord);
    }
  }
  
  // Save updated user data
  if (!writeJsonFile(USERS_FILE, usersData)) {
    return res.status(500).json({ error: 'Failed to update user progress' });
  }
  
  // Return feedback
  return res.status(200).json({
    correct: isCorrect,
    correctAnswer: correctWord.english,
    latinWord: correctWord.latin,
    latinSentence: correctWord.latinSentence,
    englishSentence: correctWord.englishSentence,
    message: isCorrect ? 'Correct! Great job!' : 'Incorrect. Try again!'
  });
};
