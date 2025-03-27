const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());

// Path to data files
const VOCABULARY_FILE = path.join(__dirname, 'vocabulary.json');
const USERS_FILE = path.join(__dirname, 'users.json');

// Helper function to read JSON files
function readJsonFile(filePath) {
  console.log(`Reading file: ${filePath}`);
  try {
    if (!fs.existsSync(filePath)) {
      console.error(`File does not exist: ${filePath}`);
      return null;
    }
    
    const data = fs.readFileSync(filePath, 'utf8');
    console.log(`File read successfully, size: ${data.length} bytes`);
    
    try {
      const jsonData = JSON.parse(data);
      console.log('JSON parsed successfully');
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

// Helper function to write JSON files
function writeJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`Error writing file ${filePath}:`, error);
    return false;
  }
}

// Get all chapters
app.get('/api/vocabulary/chapters', (req, res) => {
  console.log('GET /api/vocabulary/chapters requested');
  try {
    const vocabularyData = readJsonFile(VOCABULARY_FILE);
    
    if (!vocabularyData) {
      console.error('Failed to read vocabulary data');
      return res.status(500).json({ error: 'Failed to read vocabulary data' });
    }
    
    console.log(`Found ${vocabularyData.chapters.length} chapters in vocabulary data`);
    
    // For simplicity, return all chapters
    // In a real app, you might filter based on user progress
    res.json(vocabularyData.chapters);
  } catch (error) {
    console.error('Error in /api/vocabulary/chapters:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Get chapter by number
app.get('/api/vocabulary/chapters/:chapterNumber', (req, res) => {
  const chapterNumber = parseInt(req.params.chapterNumber, 10);
  
  try {
    const vocabularyData = readJsonFile(VOCABULARY_FILE);
    
    if (!vocabularyData) {
      return res.status(500).json({ error: 'Failed to read vocabulary data' });
    }
    
    const chapter = vocabularyData.chapters.find(c => c.chapterNumber === chapterNumber);
    
    if (!chapter) {
      return res.status(404).json({ error: 'Chapter not found' });
    }
    
    res.json(chapter);
  } catch (error) {
    console.error(`Error in /api/vocabulary/chapters/${chapterNumber}:`, error);
    return res.status(500).json({ error: error.message });
  }
});



// Get next question for practice
app.get('/api/practice/next-question', (req, res) => {
  const { chapter, mode, questionFormat } = req.query;
  const vocabularyData = readJsonFile(VOCABULARY_FILE);
  
  if (!vocabularyData) {
    return res.status(500).json({ error: 'Failed to read vocabulary data' });
  }
  
  let wordsPool = [];
  
  // Different modes for selecting words
  if (mode === 'weak-words' && req.query.username) {
    // Get frequently mistaken words for this user
    const usersData = readJsonFile(USERS_FILE);
    if (!usersData) {
      return res.status(500).json({ error: 'Failed to read user data' });
    }
    
    const user = usersData.users.find(u => u.username === req.query.username);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get all available words
    vocabularyData.chapters.forEach(chapter => {
      wordsPool = [...wordsPool, ...chapter.words];
    });
    
    // Filter for weak words (more than 30% incorrect)
    wordsPool = wordsPool.filter(word => {
      const progress = user.vocabProgress[word.latin];
      if (!progress) return false;
      
      const total = progress.correctCount + progress.incorrectCount;
      return total > 0 && (progress.incorrectCount / total) > 0.3;
    });
    
    if (wordsPool.length === 0) {
      // Fall back to random words if no weak words
      const chapterIndex = Math.max(0, Math.min(vocabularyData.chapters.length - 1, user.chapterProgress - 1));
      wordsPool = vocabularyData.chapters[chapterIndex].words;
    }
  } else if (chapter) {
    // Get words from a specific chapter
    const chapterNumber = parseInt(chapter, 10);
    const selectedChapter = vocabularyData.chapters.find(c => c.chapterNumber === chapterNumber);
    
    if (!selectedChapter) {
      return res.status(404).json({ error: 'Chapter not found' });
    }
    
    wordsPool = selectedChapter.words;
  } else {
    // Default: get words from the first chapter
    wordsPool = vocabularyData.chapters[0].words;
  }
  
  // No words available
  if (wordsPool.length === 0) {
    return res.status(404).json({ error: 'No words available for practice' });
  }
  
  // Select a random word for the question
  const randomWord = wordsPool[Math.floor(Math.random() * wordsPool.length)];
  
  // Determine question format: multiple-choice or fill-in-the-blank
  const format = questionFormat || (Math.random() > 0.5 ? 'multiple-choice' : 'fill-in-the-blank');
  
  // Determine direction: latin-to-english or english-to-latin
  const direction = Math.random() > 0.5 ? 'latin-to-english' : 'english-to-latin';
  
  let question;
  
  if (format === 'multiple-choice') {
    // Create distractors (wrong answers) from other words
    let distractors = [];
    vocabularyData.chapters.forEach(chapter => {
      distractors = [...distractors, ...chapter.words.filter(w => w.latin !== randomWord.latin)];
    });
    
    // For latin-to-english, use English distractors
    if (direction === 'latin-to-english') {
      // Shuffle and get 3 distractors
      distractors = distractors
        .sort(() => 0.5 - Math.random())
        .slice(0, 3)
        .map(word => word.english);
      
      // Ask for the English translation of a Latin word
      question = {
        format: 'multiple-choice',
        type: direction,
        questionText: `What is the English translation of "${randomWord.latin}"?`,
        latinWord: randomWord.latin,
        correctAnswer: randomWord.english,
        options: [...distractors, randomWord.english].sort(() => 0.5 - Math.random()),
        latinSentence: randomWord.latinSentence,
        englishSentence: randomWord.englishSentence
      };
    } else {
      // Ask for the Latin translation of an English word
      // Get Latin distractors
      distractors = distractors
        .sort(() => 0.5 - Math.random())
        .slice(0, 3)
        .map(() => {
          // Get random Latin words as distractors
          const randomDistractor = wordsPool[Math.floor(Math.random() * wordsPool.length)];
          return randomDistractor.latin;
        });
      
      question = {
        format: 'multiple-choice',
        type: direction,
        questionText: `What is the Latin translation of "${randomWord.english}"?`,
        englishWord: randomWord.english,
        correctAnswer: randomWord.latin,
        options: [...distractors, randomWord.latin].sort(() => 0.5 - Math.random()),
        latinSentence: randomWord.latinSentence,
        englishSentence: randomWord.englishSentence
      };
    }
  } else {
    // Fill-in-the-blank format
    if (direction === 'latin-to-english') {
      // Create a cloze with English translation (blank)
      const fullSentence = randomWord.englishSentence;
      const wordToReplace = randomWord.english;
      
      // Replace the word with a blank (handle multiple forms of the word by checking if it contains the word)
      const clozePattern = new RegExp(`\\b${wordToReplace}\\b`, 'i');
      const clozeSentence = fullSentence.replace(clozePattern, '___________');
      
      question = {
        format: 'fill-in-the-blank',
        type: direction,
        questionText: `Fill in the blank with the English translation of "${randomWord.latin}":`,
        sentence: clozeSentence,
        latinWord: randomWord.latin,
        correctAnswer: randomWord.english,
        latinSentence: randomWord.latinSentence,
        englishSentence: randomWord.englishSentence
      };
    } else {
      // Create a cloze with Latin translation (blank)
      const fullSentence = randomWord.latinSentence;
      const wordToReplace = randomWord.latin;
      
      // Replace the word with a blank
      const clozePattern = new RegExp(`\\b${wordToReplace}\\b`, 'i');
      const clozeSentence = fullSentence.replace(clozePattern, '___________');
      
      question = {
        format: 'fill-in-the-blank',
        type: direction,
        questionText: `Fill in the blank with the Latin translation of "${randomWord.english}":`,
        sentence: clozeSentence,
        englishWord: randomWord.english,
        correctAnswer: randomWord.latin,
        latinSentence: randomWord.latinSentence,
        englishSentence: randomWord.englishSentence
      };
    }
  }
  
  res.json(question);
});

// Submit an answer
app.post('/api/practice/submit-answer', (req, res) => {
  const { username, latinWord, userAnswer, format } = req.body;
  
  if (!username || !latinWord || !userAnswer) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  // Read files
  const vocabularyData = readJsonFile(VOCABULARY_FILE);
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
    
    isCorrect = (
      normalizedUserAnswer === normalizedCorrectEnglish || 
      normalizedUserAnswer === normalizedCorrectLatin
    );
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
  
  if (isCorrect) {
    usersData.users[userIndex].vocabProgress[latinWord].correctCount += 1;
  } else {
    usersData.users[userIndex].vocabProgress[latinWord].incorrectCount += 1;
  }
  
  // Save updated user data
  if (!writeJsonFile(USERS_FILE, usersData)) {
    return res.status(500).json({ error: 'Failed to update user progress' });
  }
  
  // Return feedback
  res.json({
    correct: isCorrect,
    correctAnswer: correctWord.english,
    latinWord: correctWord.latin,
    latinSentence: correctWord.latinSentence,
    englishSentence: correctWord.englishSentence,
    message: isCorrect ? 'Correct! Great job!' : 'Incorrect. Try again!'
  });
});

// Get user progress
app.get('/api/users/:username/progress', (req, res) => {
  const { username } = req.params;
  
  const usersData = readJsonFile(USERS_FILE);
  
  if (!usersData) {
    return res.status(500).json({ error: 'Failed to read user data' });
  }
  
  const user = usersData.users.find(u => u.username === username);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  res.json({
    chapterProgress: user.chapterProgress,
    vocabProgress: user.vocabProgress
  });
});

// User login (simplified, no real auth)
app.post('/api/users/login', (req, res) => {
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
  
  res.json({
    username: user.username,
    chapterProgress: user.chapterProgress
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Vocabulary file: ${VOCABULARY_FILE}`);
  console.log(`Users file: ${USERS_FILE}`);
});