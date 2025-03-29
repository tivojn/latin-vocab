const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const config = require('./config');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());

const VOCABULARY_FILES = {
  'bk1': path.join(__dirname, config.data.vocabularyFiles.bk1),
  'bk2': path.join(__dirname, config.data.vocabularyFiles.bk2)
};

const DEFAULT_BOOK = config.data.defaultBook;
const USERS_FILE = path.join(__dirname, config.data.usersFile);

function filterMasteredWords(wordsPool, username) {
  if (!username) return wordsPool;
  
  const usersData = readJsonFile(USERS_FILE);
  if (!usersData) return wordsPool;
  
  const user = usersData.users.find(u => u.username === username);
  if (!user) return wordsPool;
  
  const originalSize = wordsPool.length;
  
  const masteredWords = Object.entries(user.vocabProgress)
    .filter(([latin, progress]) => {
      const { correctCount, incorrectCount } = progress;
      const total = correctCount + incorrectCount;
      return correctCount >= config.learningAlgorithm.masterThreshold && 
             (correctCount / total) >= config.learningAlgorithm.masterAccuracyThreshold;
    })
    .map(([latin]) => latin);
  
  const potentialFilteredOutCount = wordsPool.filter(word => 
    masteredWords.includes(word.latin) && 
    !(global.usedWordsTracker[username]?.incorrectWords.has(word.latin))
  ).length;
  
  if (potentialFilteredOutCount >= originalSize * 0.9) {
    console.log(`Not filtering mastered words because it would remove ${potentialFilteredOutCount}/${originalSize} words`);
    return wordsPool;
  }
  
  const filteredPool = wordsPool.filter(word => {
    return !masteredWords.includes(word.latin) || 
          (global.usedWordsTracker[username]?.incorrectWords.has(word.latin));
  });
  
  console.log(`Filtered out ${originalSize - filteredPool.length} mastered words. Pool size: ${filteredPool.length}`);
  return filteredPool;
}

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

function writeJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`Error writing file ${filePath}:`, error);
    return false;
  }
}

app.get('/api/vocabulary/chapters', (req, res) => {
  try {
    const book = req.query.book || DEFAULT_BOOK;
    const vocabularyFile = VOCABULARY_FILES[book] || VOCABULARY_FILES[DEFAULT_BOOK];
    
    const vocabularyData = readJsonFile(vocabularyFile);
    
    if (!vocabularyData) {
      return res.status(500).json({ error: 'Failed to read vocabulary data' });
    }
    
    res.json(vocabularyData.chapters);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/vocabulary/books', (req, res) => {
  try {
    const books = [
      { id: 'bk1', title: 'Cambridge Latin Course Book 1' },
      { id: 'bk2', title: 'Cambridge Latin Course Book 2' }
    ];
    
    res.json(books);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/vocabulary/chapters/:chapterNumber', (req, res) => {
  const chapterNumber = parseInt(req.params.chapterNumber, 10);
  const book = req.query.book || DEFAULT_BOOK;
  const vocabularyFile = VOCABULARY_FILES[book] || VOCABULARY_FILES[DEFAULT_BOOK];
  
  try {
    const vocabularyData = readJsonFile(vocabularyFile);
    
    if (!vocabularyData) {
      return res.status(500).json({ error: 'Failed to read vocabulary data' });
    }
    
    const chapter = vocabularyData.chapters.find(c => c.chapterNumber === chapterNumber);
    
    if (!chapter) {
      return res.status(404).json({ error: 'Chapter not found' });
    }
    
    res.json(chapter);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/practice/next-question', (req, res) => {
  const { chapter, mode, questionFormat, book } = req.query;
  const vocabularyFile = VOCABULARY_FILES[book || DEFAULT_BOOK];
  const vocabularyData = readJsonFile(vocabularyFile);
  
  if (!vocabularyData) {
    return res.status(500).json({ error: 'Failed to read vocabulary data' });
  }
  
  let wordsPool = [];
  let selectedWord = null;
  let recentlyUsedWords = [];
  
  if (typeof global.usedWordsTracker === 'undefined') {
    global.usedWordsTracker = {};
  }
  
  // Reset tracker if in a serverless environment (like Vercel)
  if (process.env.VERCEL) {
    if (!global._vercelTracker) {
      global._vercelTracker = {};
    }
    global.usedWordsTracker = global._vercelTracker;
  }
  
  if (req.query.username) {
    if (!global.usedWordsTracker[req.query.username]) {
      global.usedWordsTracker[req.query.username] = {
        wordHistory: [],
        incorrectWords: new Set(),
        lastChapter: null,
        chapterWordIndex: 0
      };
    }
    
    recentlyUsedWords = global.usedWordsTracker[req.query.username].wordHistory;
  }
  
  if (mode === 'weak-words' && req.query.username) {
    const usersData = readJsonFile(USERS_FILE);
    if (!usersData) {
      return res.status(500).json({ error: 'Failed to read user data' });
    }
    
    const user = usersData.users.find(u => u.username === req.query.username);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const incorrectWordSet = global.usedWordsTracker[req.query.username].incorrectWords;
    if (incorrectWordSet.size > 0) {
      const allWords = [];
      vocabularyData.chapters.forEach(chapter => {
        allWords.push(...chapter.words);
      });
      
      const incorrectWords = allWords.filter(word => incorrectWordSet.has(word.latin));
      
      if (incorrectWords.length > 0) {
        selectedWord = incorrectWords[0];
        incorrectWordSet.delete(selectedWord.latin);
      }
    }
    
    if (!selectedWord) {
      vocabularyData.chapters.forEach(chapter => {
        wordsPool = [...wordsPool, ...chapter.words];
      });
      
      wordsPool = wordsPool.filter(word => {
        const progress = user.vocabProgress[word.latin];
        if (!progress) return false;
        
        const total = progress.correctCount + progress.incorrectCount;
        return total > 0 && (progress.incorrectCount / total) > config.learningAlgorithm.weakWordThreshold;
      });
      
      if (wordsPool.length === 0) {
        const chapterIndex = Math.max(0, Math.min(vocabularyData.chapters.length - 1, user.chapterProgress - 1));
        wordsPool = vocabularyData.chapters[chapterIndex].words;
      }
      
      wordsPool = filterMasteredWords(wordsPool, req.query.username);
    
      wordsPool = wordsPool.filter(word => !recentlyUsedWords.includes(word.latin));
      
      if (wordsPool.length === 0) {
        if (req.query.username) {
          global.usedWordsTracker[req.query.username].wordHistory = [];
        }
        
        const chapterIndex = Math.max(0, Math.min(vocabularyData.chapters.length - 1, user.chapterProgress - 1));
        wordsPool = vocabularyData.chapters[chapterIndex].words;
      }
    }
  } else if (chapter) {
    const chapterNumber = parseInt(chapter, 10);
    const selectedChapter = vocabularyData.chapters.find(c => c.chapterNumber === chapterNumber);
    
    if (!selectedChapter) {
      return res.status(404).json({ error: 'Chapter not found' });
    }
    
    if (req.query.username) {
      const incorrectWordSet = global.usedWordsTracker[req.query.username].incorrectWords;
      
      if (incorrectWordSet.size > 0) {
        const incorrectWords = selectedChapter.words.filter(word => incorrectWordSet.has(word.latin));
        
        if (incorrectWords.length > 0) {
          selectedWord = incorrectWords[0];
          incorrectWordSet.delete(selectedWord.latin);
        }
      }
    }
    
    if (!selectedWord) {
      wordsPool = selectedChapter.words;
      
      wordsPool = filterMasteredWords(wordsPool, req.query.username);
      
      if (req.query.username && recentlyUsedWords.length > 0) {
        wordsPool = wordsPool.filter(word => !recentlyUsedWords.includes(word.latin));
        
        if (wordsPool.length === 0) {
          if (req.query.username) {
            global.usedWordsTracker[req.query.username].wordHistory = [];
          }
          wordsPool = selectedChapter.words;
          
          wordsPool = filterMasteredWords(wordsPool, req.query.username);
        }
      }
    }
  } else {
    wordsPool = vocabularyData.chapters[0].words;
    
    wordsPool = filterMasteredWords(wordsPool, req.query.username);
  }
  
  if (wordsPool.length === 0 && !selectedWord) {
    return res.status(404).json({ error: 'No words available for practice' });
  }
  
  let wordToUse;
  if (selectedWord) {
    wordToUse = selectedWord;
  } else {
    const userTracker = req.query.username ? global.usedWordsTracker[req.query.username] : null;
    
    if (wordsPool.length === 0) {
      return res.status(404).json({ error: 'No words available for practice' });
    }
    
    const currentChapter = chapter ? parseInt(chapter, 10) : null;
    
    if (userTracker && currentChapter) {
      if (userTracker.lastChapter !== currentChapter) {
        userTracker.chapterWordIndex = 0;
        userTracker.lastChapter = currentChapter;
      }
      
      const wordIndex = userTracker.chapterWordIndex % wordsPool.length;
      
      wordToUse = wordsPool[wordIndex];
      userTracker.chapterWordIndex = (wordIndex + 1) % wordsPool.length;
    } else {
      const unusedWords = wordsPool.filter(word => !recentlyUsedWords.includes(word.latin));
      
      if (unusedWords.length > 0) {
        const randomIndex = Math.floor(Math.random() * unusedWords.length);
        wordToUse = unusedWords[randomIndex];
      } else {
        const randomIndex = Math.floor(Math.random() * wordsPool.length);
        wordToUse = wordsPool[randomIndex];
      }
    }
  }
  
  if (req.query.username && wordToUse) {
    const history = global.usedWordsTracker[req.query.username].wordHistory;
    history.push(wordToUse.latin);
    
    if (history.length > config.learningAlgorithm.recentWordsMaxCount) {
      history.shift();
    }
  }
  
  const format = questionFormat || (Math.random() > 0.5 ? 'multiple-choice' : 'fill-in-the-blank');
  
  const direction = Math.random() > 0.5 ? 'latin-to-english' : 'english-to-latin';
  
  let question;
  
  if (format === 'multiple-choice') {
    if (direction === 'latin-to-english') {
      const distractorPool = [];
      vocabularyData.chapters.forEach(chapter => {
        distractorPool.push(...chapter.words.filter(w => w.latin !== wordToUse.latin));
      });
      
      const shuffledPool = [...distractorPool].sort(() => 0.5 - Math.random());
      
      const options = [wordToUse.english];
      const usedOptions = new Set([wordToUse.english.toLowerCase()]);
      
      for (const word of shuffledPool) {
        const option = word.english;
        if (option && !usedOptions.has(option.toLowerCase())) {
          options.push(option);
          usedOptions.add(option.toLowerCase());
          if (options.length >= 4) break;
        }
      }
      
      if (options.length < 4) {
        const alternatives = [
          `not ${wordToUse.english}`,
          `similar to ${wordToUse.english}`,
          `different from ${wordToUse.english}`
        ];
        
        for (const alt of alternatives) {
          if (!usedOptions.has(alt.toLowerCase()) && options.length < 4) {
            options.push(alt);
            usedOptions.add(alt.toLowerCase());
          }
        }
      }
      
      const shuffledOptions = [...options].sort(() => 0.5 - Math.random());
      
      question = {
        format: 'multiple-choice',
        type: direction,
        questionText: `What is the English translation of "${wordToUse.latin}"?`,
        latinWord: wordToUse.latin,
        correctAnswer: wordToUse.english,
        options: shuffledOptions,
        latinSentence: wordToUse.latinSentence,
        englishSentence: wordToUse.englishSentence,
        optionsCount: shuffledOptions.length,
        uniqueOptions: new Set(shuffledOptions).size
      };
    } else {
      const distractorPool = [];
      vocabularyData.chapters.forEach(chapter => {
        distractorPool.push(...chapter.words.filter(w => w.latin !== wordToUse.latin));
      });
      
      const shuffledPool = [...distractorPool].sort(() => 0.5 - Math.random());
      
      const options = [wordToUse.latin];
      const usedOptions = new Set([wordToUse.latin.toLowerCase()]);
      
      for (const word of shuffledPool) {
        const option = word.latin;
        if (option && !usedOptions.has(option.toLowerCase())) {
          options.push(option);
          usedOptions.add(option.toLowerCase());
          if (options.length >= 4) break;
        }
      }
      
      if (options.length < 4) {
        const prefixes = ['non-', 'quasi-', 'pseudo-'];
        let index = 0;
        
        while (options.length < 4 && index < prefixes.length) {
          const alt = `${prefixes[index]}${wordToUse.latin}`;
          if (!usedOptions.has(alt.toLowerCase())) {
            options.push(alt);
            usedOptions.add(alt.toLowerCase());
          }
          index++;
        }
      }
      
      const shuffledOptions = [...options].sort(() => 0.5 - Math.random());
      
      question = {
        format: 'multiple-choice',
        type: direction,
        questionText: `What is the Latin translation of "${wordToUse.english}"?`,
        englishWord: wordToUse.english,
        correctAnswer: wordToUse.latin,
        options: shuffledOptions,
        latinSentence: wordToUse.latinSentence,
        englishSentence: wordToUse.englishSentence,
        optionsCount: shuffledOptions.length,
        uniqueOptions: new Set(shuffledOptions).size
      };
    }
  } else {
    if (direction === 'latin-to-english') {
      const fullSentence = wordToUse.englishSentence;
      const wordToReplace = wordToUse.english;
      
      const clozePattern = new RegExp(`\\b${wordToReplace}\\b`, 'i');
      const clozeSentence = fullSentence.replace(clozePattern, '___________');
      
      question = {
        format: 'fill-in-the-blank',
        type: direction,
        questionText: `Fill in the blank with the English translation of "${wordToUse.latin}":`,
        sentence: clozeSentence,
        latinWord: wordToUse.latin,
        correctAnswer: wordToUse.english,
        latinSentence: wordToUse.latinSentence,
        englishSentence: wordToUse.englishSentence
      };
    } else {
      const fullSentence = wordToUse.latinSentence;
      const wordToReplace = wordToUse.latin;
      
      const clozePattern = new RegExp(`\\b${wordToReplace}\\b`, 'i');
      const clozeSentence = fullSentence.replace(clozePattern, '___________');
      
      question = {
        format: 'fill-in-the-blank',
        type: direction,
        questionText: `Fill in the blank with the Latin translation of "${wordToUse.english}":`,
        sentence: clozeSentence,
        englishWord: wordToUse.english,
        correctAnswer: wordToUse.latin,
        latinSentence: wordToUse.latinSentence,
        englishSentence: wordToUse.englishSentence
      };
    }
  }
  
  if (question.format === 'multiple-choice' && question.options) {
    const allSame = question.options.every(opt => 
      opt.toLowerCase() === question.correctAnswer.toLowerCase());
    
    if (allSame) {
      const correctAnswer = question.correctAnswer;
      const finalOptions = [correctAnswer];
      
      const prefix = direction === 'latin-to-english' ? 
        ['another ', 'alternate ', 'different '] : 
        ['alterum-', 'aliud-', 'novum-'];
      
      for (let i = 0; i < 3; i++) {
        finalOptions.push(`${prefix[i]}${correctAnswer}`);
      }
      
      question.options = finalOptions.sort(() => 0.5 - Math.random());
      question.optionsCount = finalOptions.length;
      question.uniqueOptions = finalOptions.length;
      
      return res.json(question);
    }
    
    const uniqueOptions = [...new Set(question.options.map(opt => opt.toLowerCase()))];
    
    if (uniqueOptions.length < 4) {
      const finalOptions = [question.correctAnswer];
      const usedValues = new Set([question.correctAnswer.toLowerCase()]);
      
      for (const option of question.options) {
        if (!usedValues.has(option.toLowerCase())) {
          finalOptions.push(option);
          usedValues.add(option.toLowerCase());
          
          if (finalOptions.length === 4) break;
        }
      }
      
      if (finalOptions.length < 4) {
        if (direction === 'latin-to-english') {
          const alternatives = [
            `not a ${question.correctAnswer}`,
            `similar to ${question.correctAnswer}`,
            `kind of ${question.correctAnswer}`
          ];
          
          for (let i = 0; i < alternatives.length && finalOptions.length < 4; i++) {
            finalOptions.push(alternatives[i]);
          }
        } else {
          const alternatives = [
            `non-${question.correctAnswer}`,
            `quasi-${question.correctAnswer}`,
            `similis-${question.correctAnswer}`
          ];
          
          for (let i = 0; i < alternatives.length && finalOptions.length < 4; i++) {
            finalOptions.push(alternatives[i]);
          }
        }
      }
      
      question.options = finalOptions.sort(() => 0.5 - Math.random());
      question.optionsCount = finalOptions.length;
      question.uniqueOptions = finalOptions.length;
    }
  }
  
  res.json(question);
});

app.post('/api/practice/submit-answer', (req, res) => {
  const { username, latinWord, userAnswer, format, book } = req.body;
  
  if (!username || !latinWord || !userAnswer) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const vocabularyFile = VOCABULARY_FILES[book || DEFAULT_BOOK];
  const vocabularyData = readJsonFile(vocabularyFile);
  const usersData = readJsonFile(USERS_FILE);
  
  if (!vocabularyData || !usersData) {
    return res.status(500).json({ error: 'Failed to read data files' });
  }
  
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
  
  const userIndex = usersData.users.findIndex(user => user.username === username);
  
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  let isCorrect = false;
  
  if (format === 'fill-in-the-blank') {
    const normalizedUserAnswer = userAnswer.trim().toLowerCase();
    const normalizedCorrectEnglish = correctWord.english.trim().toLowerCase();
    const normalizedCorrectLatin = correctWord.latin.trim().toLowerCase();
    
    isCorrect = (
      normalizedUserAnswer === normalizedCorrectEnglish || 
      normalizedUserAnswer === normalizedCorrectLatin
    );
    
    if (!isCorrect) {
      if (normalizedUserAnswer.length > 2) {
        if (normalizedCorrectEnglish.includes(normalizedUserAnswer) ||
            normalizedCorrectLatin.includes(normalizedUserAnswer)) {
          const englishMatch = normalizedUserAnswer.length >= normalizedCorrectEnglish.length * 0.8;
          const latinMatch = normalizedUserAnswer.length >= normalizedCorrectLatin.length * 0.8;
          
          isCorrect = englishMatch || latinMatch;
        }
      }
    }
  } else {
    isCorrect = (
      userAnswer === correctWord.english || 
      userAnswer === correctWord.latin
    );
  }
  
  if (!usersData.users[userIndex].vocabProgress[latinWord]) {
    usersData.users[userIndex].vocabProgress[latinWord] = {
      correctCount: 0,
      incorrectCount: 0
    };
  }
  
  if (typeof global.usedWordsTracker === 'undefined') {
    global.usedWordsTracker = {};
  }
  
  // Reset tracker if in a serverless environment (like Vercel)
  if (process.env.VERCEL) {
    if (!global._vercelTracker) {
      global._vercelTracker = {};
    }
    global.usedWordsTracker = global._vercelTracker;
  }
  
  if (!global.usedWordsTracker[username]) {
    global.usedWordsTracker[username] = {
      wordHistory: [],
      incorrectWords: new Set(),
      lastChapter: null,
      chapterWordIndex: 0
    };
  }
  
  if (isCorrect) {
    usersData.users[userIndex].vocabProgress[latinWord].correctCount += 1;
    global.usedWordsTracker[username].incorrectWords.delete(latinWord);
  } else {
    usersData.users[userIndex].vocabProgress[latinWord].incorrectCount += 1;
    global.usedWordsTracker[username].incorrectWords.add(latinWord);
  }
  
  if (!writeJsonFile(USERS_FILE, usersData)) {
    return res.status(500).json({ error: 'Failed to update user progress' });
  }
  
  res.json({
    correct: isCorrect,
    correctAnswer: correctWord.english,
    latinWord: correctWord.latin,
    latinSentence: correctWord.latinSentence,
    englishSentence: correctWord.englishSentence,
    message: isCorrect ? 'Correct! Great job!' : 'Incorrect. Try again!'
  });
});

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

app.post('/api/users/login', (req, res) => {
  const { username } = req.body;
  
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }
  
  const usersData = readJsonFile(USERS_FILE);
  
  if (!usersData) {
    return res.status(500).json({ error: 'Failed to read user data' });
  }
  
  let user = usersData.users.find(u => u.username === username);
  
  if (!user) {
    user = {
      username,
      passwordHash: "tempHash",
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

// Handle 404 errors - must be placed after all other routes
app.use((req, res) => {
  // Check if the request is for an API endpoint
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  // For non-API requests, serve the 404.html page
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  
  // Check if the request is for an API endpoint
  if (req.path.startsWith('/api/')) {
    return res.status(500).json({ error: 'Internal server error' });
  }
  
  // For non-API requests, send a simple error page
  res.status(500).send('Server error. Please try again later.');
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});