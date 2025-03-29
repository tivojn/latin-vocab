const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const config = require('./config');

const BASE_PATH = process.env.VERCEL ? '/Latin-Vocab-Shadcn' : '';

const app = express();
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
  if (req.url.startsWith(BASE_PATH)) {
    req.url = req.url.substring(BASE_PATH.length);
  }
  next();
});

app.use(express.static(path.join(__dirname, 'public'), {
  index: false
}));
app.use(express.json());
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
  // First check in-memory file cache for Vercel environment
  if (process.env.VERCEL && global.inMemoryFiles && global.inMemoryFiles[filePath]) {
    console.log(`Reading ${filePath} from in-memory cache`);
    return global.inMemoryFiles[filePath];
  }
  
  try {
    if (!fs.existsSync(filePath)) {
      console.error(`File does not exist: ${filePath}`);
      
      // Handle missing file with fallbacks in Vercel environment
      if (process.env.VERCEL) {
        const fileName = path.basename(filePath);
        
        // Create fallback data for known files
        if (fileName === 'users.json') {
          console.log('Creating fallback users.json');
          const fallbackUsers = { users: [] };
          writeJsonFile(filePath, fallbackUsers);
          return fallbackUsers;
        } 
        else if (fileName === 'vocabulary.json' || fileName === 'vocabulary-bk2.json') {
          console.log(`Missing vocabulary file: ${fileName}`);
          return { stages: [] };
        }
      }
      
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
    
    // Check for specific errors in Vercel environment
    if (process.env.VERCEL) {
      const fileName = path.basename(filePath);
      
      // Return fallback data for known files
      if (fileName === 'users.json') {
        console.log('Returning fallback users.json due to error');
        return { users: [] };
      } 
      else if (fileName === 'vocabulary.json' || fileName === 'vocabulary-bk2.json') {
        console.log(`Returning empty stages for ${fileName} due to error`);
        return { stages: [] };
      }
    }
    
    return null;
  }
}

function writeJsonFile(filePath, data) {
  try {
    // If directory doesn't exist, try to create it
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch (dirError) {
        console.error(`Cannot create directory ${dir}:`, dirError);
        
        // In Vercel, we might not have write permissions to create directories
        if (process.env.VERCEL) {
          console.log('Using in-memory fallback due to Vercel filesystem restrictions');
          // Store in a global variable as in-memory fallback
          if (!global.inMemoryFiles) {
            global.inMemoryFiles = {};
          }
          global.inMemoryFiles[filePath] = data;
          return true;
        }
        
        return false;
      }
    }
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`Error writing file ${filePath}:`, error);
    
    // In Vercel, use in-memory storage as fallback
    if (process.env.VERCEL) {
      console.log('Using in-memory fallback due to Vercel filesystem restrictions');
      if (!global.inMemoryFiles) {
        global.inMemoryFiles = {};
      }
      global.inMemoryFiles[filePath] = data;
      return true;
    }
    
    return false;
  }
}

app.get('/api/vocabulary/stages', (req, res) => {
  try {
    const book = req.query.book || DEFAULT_BOOK;
    const vocabularyFile = VOCABULARY_FILES[book] || VOCABULARY_FILES[DEFAULT_BOOK];
    
    const vocabularyData = readJsonFile(vocabularyFile);
    
    if (!vocabularyData) {
      return res.status(500).json({ error: 'Failed to read vocabulary data' });
    }
    
    res.json(vocabularyData.stages);
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

app.get('/api/vocabulary/stages/:stageNumber', (req, res) => {
  const stageNumber = parseInt(req.params.stageNumber, 10);
  const book = req.query.book || DEFAULT_BOOK;
  const vocabularyFile = VOCABULARY_FILES[book] || VOCABULARY_FILES[DEFAULT_BOOK];
  
  try {
    const vocabularyData = readJsonFile(vocabularyFile);
    
    if (!vocabularyData) {
      return res.status(500).json({ error: 'Failed to read vocabulary data' });
    }
    
    const stage = vocabularyData.stages.find(s => s.stageNumber === stageNumber);
    
    if (!stage) {
      return res.status(404).json({ error: 'Stage not found' });
    }
    
    res.json(stage);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/practice/next-question', (req, res) => {
  const { stage, mode, questionFormat, book } = req.query;
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
        lastStage: null,
        stageWordIndex: 0
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
      vocabularyData.stages.forEach(stage => {
        allWords.push(...stage.words);
      });
      
      const incorrectWords = allWords.filter(word => incorrectWordSet.has(word.latin));
      
      if (incorrectWords.length > 0) {
        selectedWord = incorrectWords[0];
        incorrectWordSet.delete(selectedWord.latin);
      }
    }
    
    if (!selectedWord) {
      vocabularyData.stages.forEach(stage => {
        wordsPool = [...wordsPool, ...stage.words];
      });
      
      wordsPool = wordsPool.filter(word => {
        const progress = user.vocabProgress[word.latin];
        if (!progress) return false;
        
        const total = progress.correctCount + progress.incorrectCount;
        return total > 0 && (progress.incorrectCount / total) > config.learningAlgorithm.weakWordThreshold;
      });
      
      if (wordsPool.length === 0) {
        const stageIndex = Math.max(0, Math.min(vocabularyData.stages.length - 1, user.stageProgress - 1));
        wordsPool = vocabularyData.stages[stageIndex].words;
      }
      
      wordsPool = filterMasteredWords(wordsPool, req.query.username);
    
      wordsPool = wordsPool.filter(word => !recentlyUsedWords.includes(word.latin));
      
      if (wordsPool.length === 0) {
        if (req.query.username) {
          global.usedWordsTracker[req.query.username].wordHistory = [];
        }
        
        const stageIndex = Math.max(0, Math.min(vocabularyData.stages.length - 1, user.stageProgress - 1));
        wordsPool = vocabularyData.stages[stageIndex].words;
      }
    }
  } else if (stage) {
    const stageNumber = parseInt(stage, 10);
    const selectedStage = vocabularyData.stages.find(s => s.stageNumber === stageNumber);
    
    if (!selectedStage) {
      return res.status(404).json({ error: 'Stage not found' });
    }
    
    if (req.query.username) {
      const incorrectWordSet = global.usedWordsTracker[req.query.username].incorrectWords;
      
      if (incorrectWordSet.size > 0) {
        const incorrectWords = selectedStage.words.filter(word => incorrectWordSet.has(word.latin));
        
        if (incorrectWords.length > 0) {
          selectedWord = incorrectWords[0];
          incorrectWordSet.delete(selectedWord.latin);
        }
      }
    }
    
    if (!selectedWord) {
      wordsPool = selectedStage.words;
      
      wordsPool = filterMasteredWords(wordsPool, req.query.username);
      
      if (req.query.username && recentlyUsedWords.length > 0) {
        wordsPool = wordsPool.filter(word => !recentlyUsedWords.includes(word.latin));
        
        if (wordsPool.length === 0) {
          if (req.query.username) {
            global.usedWordsTracker[req.query.username].wordHistory = [];
          }
          wordsPool = selectedStage.words;
          
          wordsPool = filterMasteredWords(wordsPool, req.query.username);
        }
      }
    }
  } else {
    wordsPool = vocabularyData.stages[0].words;
    
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
    
    const currentStage = stage ? parseInt(stage, 10) : null;
    
    if (userTracker && currentStage) {
      if (userTracker.lastStage !== currentStage) {
        userTracker.stageWordIndex = 0;
        userTracker.lastStage = currentStage;
      }
      
      const wordIndex = userTracker.stageWordIndex % wordsPool.length;
      
      wordToUse = wordsPool[wordIndex];
      userTracker.stageWordIndex = (wordIndex + 1) % wordsPool.length;
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
      vocabularyData.stages.forEach(stage => {
        distractorPool.push(...stage.words.filter(w => w.latin !== wordToUse.latin));
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
      vocabularyData.stages.forEach(stage => {
        distractorPool.push(...stage.words.filter(w => w.latin !== wordToUse.latin));
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
  
  for (const stage of vocabularyData.stages) {
    const foundWord = stage.words.find(word => word.latin === latinWord);
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
      lastStage: null,
      stageWordIndex: 0
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
    stageProgress: user.stageProgress,
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
      stageProgress: 1,
      vocabProgress: {}
    };
    
    usersData.users.push(user);
    
    if (!writeJsonFile(USERS_FILE, usersData)) {
      return res.status(500).json({ error: 'Failed to create user' });
    }
  }
  
  res.json({
    username: user.username,
    stageProgress: user.stageProgress
  });
});

// Debug API endpoints
app.get('/api/debug/environment', (req, res) => {
  res.json({
    nodeEnv: process.env.NODE_ENV || 'development',
    isVercel: !!process.env.VERCEL,
    rootPath: __dirname,
    vocabFilesPath: {
      bk1: VOCABULARY_FILES['bk1'],
      bk2: VOCABULARY_FILES['bk2']
    },
    usersFilePath: USERS_FILE
  });
});

app.get('/api/debug/files', (req, res) => {
  const files = {
    'vocabulary-bk1.json': {
      exists: fs.existsSync(VOCABULARY_FILES['bk1']),
      message: ''
    },
    'vocabulary-bk2.json': {
      exists: fs.existsSync(VOCABULARY_FILES['bk2']),
      message: ''
    },
    'users.json': {
      exists: fs.existsSync(USERS_FILE),
      message: ''
    },
    'config.js': {
      exists: fs.existsSync(path.join(__dirname, 'config.js')),
      message: ''
    },
    'public/index.html': {
      exists: fs.existsSync(path.join(__dirname, 'public', 'index.html')),
      message: ''
    },
    'public/app.js': {
      exists: fs.existsSync(path.join(__dirname, 'public', 'app.js')),
      message: ''
    },
    'public/styles.css': {
      exists: fs.existsSync(path.join(__dirname, 'public', 'styles.css')),
      message: ''
    }
  };
  
  // Try to read the first few bytes of each file to check permissions
  for (const [file, result] of Object.entries(files)) {
    if (result.exists) {
      try {
        const filePath = file.includes('public/') 
          ? path.join(__dirname, file)
          : (file === 'vocabulary-bk1.json' 
              ? VOCABULARY_FILES['bk1'] 
              : (file === 'vocabulary-bk2.json' 
                  ? VOCABULARY_FILES['bk2'] 
                  : (file === 'users.json' 
                      ? USERS_FILE 
                      : path.join(__dirname, file))));
        
        const buffer = Buffer.alloc(10);
        const fd = fs.openSync(filePath, 'r');
        fs.readSync(fd, buffer, 0, 10, 0);
        fs.closeSync(fd);
        
        result.message = 'Readable';
      } catch (error) {
        result.message = `Error: ${error.code || error.message}`;
      }
    }
  }
  
  res.json({ files });
});

app.get('/api/debug/routes', (req, res) => {
  // Map Express routes
  const routes = [];
  
  app._router.stack.forEach(middleware => {
    if (middleware.route) { // routes registered directly on the app
      routes.push({
        path: middleware.route.path,
        method: Object.keys(middleware.route.methods)[0].toUpperCase()
      });
    } else if (middleware.name === 'router') { // router middleware
      middleware.handle.stack.forEach(handler => {
        if (handler.route) {
          routes.push({
            path: handler.route.path,
            method: Object.keys(handler.route.methods)[0].toUpperCase()
          });
        }
      });
    }
  });
  
  res.json({ routes: routes.filter(route => route.path.startsWith('/api')) });
});

app.get('/api/debug/access', (req, res) => {
  const result = {
    currentDir: __dirname,
    parentDir: path.dirname(__dirname),
    dirContents: []
  };
  
  try {
    const contents = fs.readdirSync(__dirname);
    result.dirContents = contents.map(item => {
      const itemPath = path.join(__dirname, item);
      return {
        name: item,
        type: fs.statSync(itemPath).isDirectory() ? 'directory' : 'file'
      };
    });
  } catch (error) {
    result.error = error.message;
  }
  
  res.json(result);
});

// Simple route to create a test user in users.json if it doesn't exist
app.get('/api/debug/create-test-user', (req, res) => {
  try {
    const usersData = readJsonFile(USERS_FILE) || { users: [] };
    
    if (!usersData.users) {
      usersData.users = [];
    }
    
    // Check if test_user already exists
    const userExists = usersData.users.some(user => user.username === 'test_user');
    
    if (!userExists) {
      // Add test user
      usersData.users.push({
        username: 'test_user',
        passwordHash: 'test_hash',
        stageProgress: 1,
        vocabProgress: {}
      });
      
      // Write back to file
      if (writeJsonFile(USERS_FILE, usersData)) {
        res.json({ success: true, message: 'Test user created successfully' });
      } else {
        res.status(500).json({ success: false, message: 'Failed to write user data' });
      }
    } else {
      res.json({ success: true, message: 'Test user already exists' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Serve index.html for client-side routing (before 404 handler)
app.get('*', (req, res, next) => {
  // Skip API routes
  if (req.path.startsWith('/api/')) {
    return next();
  }
  
  // Skip direct file requests for paths with file extensions
  if (req.path.includes('.')) {
    const filePath = path.join(__dirname, 'public', req.path);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return next();
    }
  }
  
  // Otherwise serve index.html
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
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

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

module.exports = app;