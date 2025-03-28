  // Create a function to completely avoid duplicates in options
  function generateUniqueOptions(correctAnswer, availableWords, direction, wordProperty) {
    console.log(`Generating unique options for ${direction} with correct answer: ${correctAnswer}`);
    
    // Make a copy so we don't modify the original
    const possibleDistractors = [...availableWords];
    
    // Extract the property we're looking for (latin or english)
    const distractorValues = possibleDistractors.map(word => word[wordProperty]);
    
    // Remove the correct answer from options
    const filteredOptions = distractorValues.filter(option => 
      option.toLowerCase() !== correctAnswer.toLowerCase());
    
    // Shuffle the remaining options
    const shuffledOptions = filteredOptions.sort(() => 0.5 - Math.random());
    
    // Take only 3 options or fewer if not enough are available
    const chosenDistractors = shuffledOptions.slice(0, 3);
    
    console.log('Generated distractors:', chosenDistractors);
    
    // Make sure no duplicates occur (might happen with case sensitivity)
    const uniqueDistractors = [...new Set(chosenDistractors)];
    
    // If we don't have enough unique options, add some generic ones
    while (uniqueDistractors.length < 3) {
      // Generate fallback options
      const fallbackOption = direction === 'latin-to-english' ?
        `option${uniqueDistractors.length + 1}` :
        `latinum${uniqueDistractors.length + 1}`;
      
      uniqueDistractors.push(fallbackOption);
    }
    
    // Add the correct answer
    const allOptions = [...uniqueDistractors, correctAnswer];
    
    // Final check for duplicates by creating a new Set and comparing lengths
    const uniqueOptionsSet = new Set(allOptions.map(opt => opt.toLowerCase()));
    if (uniqueOptionsSet.size !== allOptions.length) {
      console.warn('Warning: Still have duplicates after processing! Removing duplicates...');
      // Fix by making a completely unique array
      return [...new Set(allOptions)];
    }
    
    // Shuffle the final options and return
    return allOptions.sort(() => 0.5 - Math.random());
  }const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());

// Path to data files
const VOCABULARY_FILES = {
  'bk1': path.join(__dirname, 'vocabulary-bk1.json'),
  'bk2': path.join(__dirname, 'vocabulary-bk2.json')
};

// Default to Book 1 for backward compatibility
const DEFAULT_BOOK = 'bk1';
const USERS_FILE = path.join(__dirname, 'users.json');

// Create a function to generate completely unique options without any duplicates
function generateUniqueOptions(correctAnswer, availableWords, direction, wordProperty) {
  console.log(`Generating unique options for ${direction} with correct answer: ${correctAnswer}`);
  
  // Initialize result array with the correct answer
  const result = [correctAnswer];
  
  // Track used options to avoid duplicates (case-insensitive)
  const usedOptions = new Set([correctAnswer.toLowerCase()]);
  
  // Extract the property we're looking for (latin or english) from available words
  // and filter out any that match the correct answer
  const candidateOptions = availableWords
    .map(word => word[wordProperty])
    .filter(option => !usedOptions.has(option.toLowerCase()));
  
  // Shuffle the candidates
  const shuffledCandidates = [...candidateOptions].sort(() => 0.5 - Math.random());
  
  // Add unique options until we have 4 total or exhaust candidates
  for (const option of shuffledCandidates) {
    if (!usedOptions.has(option.toLowerCase())) {
      result.push(option);
      usedOptions.add(option.toLowerCase());
      
      // Break once we have 4 total options
      if (result.length === 4) break;
    }
  }
  
  console.log(`After first pass: ${result.length} options`);
  
  // If we still need more options, create synthetic ones
  if (result.length < 4) {
    const prefix = direction === 'latin-to-english' ? 'option' : 'latinum';
    
    for (let i = result.length; i < 4; i++) {
      const syntheticOption = `${prefix}${i}`;
      result.push(syntheticOption);
    }
  }
  
  // Double-check for any duplicates that might have slipped through
  const uniqueResult = Array.from(new Set(result.map(item => item)));
  
  // If duplicates were found and removed, add replacements
  if (uniqueResult.length < 4) {
    const prefix = direction === 'latin-to-english' ? 'alt-option' : 'alt-latinum';
    
    for (let i = uniqueResult.length; i < 4; i++) {
      const syntheticOption = `${prefix}${i}`;
      uniqueResult.push(syntheticOption);
    }
  }
  
  console.log(`Final options count: ${uniqueResult.length}`);
  console.log('Final options:', uniqueResult);
  
  // Return shuffled result
  return uniqueResult.sort(() => 0.5 - Math.random());
}

// Helper function to filter out mastered words
function filterMasteredWords(wordsPool, username) {
  if (!username) return wordsPool;
  
  const usersData = readJsonFile(USERS_FILE);
  if (!usersData) return wordsPool;
  
  const user = usersData.users.find(u => u.username === username);
  if (!user) return wordsPool;
  
  // Identify mastered words (words with at least 3 correct attempts and >75% accuracy)
  const masteredWords = Object.entries(user.vocabProgress)
    .filter(([latin, progress]) => {
      const { correctCount, incorrectCount } = progress;
      const total = correctCount + incorrectCount;
      return correctCount >= 3 && (correctCount / total) >= 0.75;
    })
    .map(([latin]) => latin);
  
  // Original word pool size
  const originalSize = wordsPool.length;
  
  // Filter out mastered words
  const filteredPool = wordsPool.filter(word => {
    // Either the word is not mastered or it's recently incorrect
    return !masteredWords.includes(word.latin) || 
          (global.usedWordsTracker[username]?.incorrectWords.has(word.latin));
  });
  
  console.log(`Filtered out ${originalSize - filteredPool.length} mastered words. Pool size: ${filteredPool.length}`);
  return filteredPool;
}

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
    const book = req.query.book || DEFAULT_BOOK;
    const vocabularyFile = VOCABULARY_FILES[book] || VOCABULARY_FILES[DEFAULT_BOOK];
    
    console.log(`Using vocabulary file for book: ${book}`);
    const vocabularyData = readJsonFile(vocabularyFile);
    
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

// Get available books
app.get('/api/vocabulary/books', (req, res) => {
  console.log('GET /api/vocabulary/books requested');
  try {
    // Return list of available books
    const books = [
      { id: 'bk1', title: 'Cambridge Latin Course Book 1' },
      { id: 'bk2', title: 'Cambridge Latin Course Book 2' }
    ];
    
    res.json(books);
  } catch (error) {
    console.error('Error in /api/vocabulary/books:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Get chapter by number
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
    console.error(`Error in /api/vocabulary/chapters/${chapterNumber}:`, error);
    return res.status(500).json({ error: error.message });
  }
});



// Get next question for practice
app.get('/api/practice/next-question', (req, res) => {
  console.log('\n========== NEW QUESTION REQUEST ==========');
  console.log('Request query:', req.query);
  
  const { chapter, mode, questionFormat, book } = req.query;
  const vocabularyFile = VOCABULARY_FILES[book || DEFAULT_BOOK];
  const vocabularyData = readJsonFile(vocabularyFile);
  
  if (!vocabularyData) {
    return res.status(500).json({ error: 'Failed to read vocabulary data' });
  }
  
  let wordsPool = [];
  let selectedWord = null;
  let recentlyUsedWords = [];
  
  // Track used words by username in-memory (could be moved to a more persistent solution later)
  if (!global.usedWordsTracker) {
    global.usedWordsTracker = {};
  }
  
  // If user is logged in, get or initialize their word history
  if (req.query.username) {
    if (!global.usedWordsTracker[req.query.username]) {
      global.usedWordsTracker[req.query.username] = {
        wordHistory: [], // List of recently used words (Latin forms)
        incorrectWords: new Set() // Set of words answered incorrectly
      };
    }
    
    recentlyUsedWords = global.usedWordsTracker[req.query.username].wordHistory;
  }
  
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
    
    // Check if there are words that were recently answered incorrectly
    const incorrectWordSet = global.usedWordsTracker[req.query.username].incorrectWords;
    if (incorrectWordSet.size > 0) {
      // Get all available words
      const allWords = [];
      vocabularyData.chapters.forEach(chapter => {
        allWords.push(...chapter.words);
      });
      
      // Find words that were answered incorrectly
      const incorrectWords = allWords.filter(word => incorrectWordSet.has(word.latin));
      
      if (incorrectWords.length > 0) {
        // Pick one incorrect word to retest
        selectedWord = incorrectWords[0];
        // Remove it from the incorrect words set
        incorrectWordSet.delete(selectedWord.latin);
      }
    }
    
    if (!selectedWord) {
      // If no incorrect word to retest or none selected, proceed with normal weak words logic
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
      
      // Filter out mastered words unless they were incorrect
      wordsPool = filterMasteredWords(wordsPool, req.query.username);
    
    // Filter out recently used words unless they were incorrect
    wordsPool = wordsPool.filter(word => !recentlyUsedWords.includes(word.latin));
      
      // If we've exhausted the word pool, reset and use all words
      if (wordsPool.length === 0) {
        console.log('Word pool exhausted, resetting history...');
        if (req.query.username) {
          global.usedWordsTracker[req.query.username].wordHistory = [];
        }
        
        const chapterIndex = Math.max(0, Math.min(vocabularyData.chapters.length - 1, user.chapterProgress - 1));
        wordsPool = vocabularyData.chapters[chapterIndex].words;
      }
    }
  } else if (chapter) {
    // Get words from a specific chapter
    const chapterNumber = parseInt(chapter, 10);
    const selectedChapter = vocabularyData.chapters.find(c => c.chapterNumber === chapterNumber);
    
    if (!selectedChapter) {
      return res.status(404).json({ error: 'Chapter not found' });
    }
    
    // Check if there are words that were recently answered incorrectly for this user and chapter
    if (req.query.username) {
      const incorrectWordSet = global.usedWordsTracker[req.query.username].incorrectWords;
      
      if (incorrectWordSet.size > 0) {
        // Find words that were answered incorrectly and are in this chapter
        const incorrectWords = selectedChapter.words.filter(word => incorrectWordSet.has(word.latin));
        
        if (incorrectWords.length > 0) {
          // Pick one incorrect word to retest
          selectedWord = incorrectWords[0];
          // Remove it from the incorrect words set
          incorrectWordSet.delete(selectedWord.latin);
        }
      }
    }
    
    if (!selectedWord) {
      // If no incorrect word to retest, proceed with normal chapter selection
      wordsPool = selectedChapter.words;
      
      // Filter out mastered words unless they were incorrect (for logged-in users)
      wordsPool = filterMasteredWords(wordsPool, req.query.username);
      
      // Filter out recently used words for this user
      if (req.query.username && recentlyUsedWords.length > 0) {
        // Create a copy of the chapter words that haven't been recently used
        wordsPool = wordsPool.filter(word => !recentlyUsedWords.includes(word.latin));
        
        // If we've used all words, reset the history
        if (wordsPool.length === 0) {
          console.log('Chapter words exhausted, resetting history...');
          if (req.query.username) {
            global.usedWordsTracker[req.query.username].wordHistory = [];
          }
          // Restart with all chapter words, not including mastered ones
          wordsPool = selectedChapter.words;
          
          // Re-apply mastered word filtering
          wordsPool = filterMasteredWords(wordsPool, req.query.username);
        }
      }
    }
  } else {
    // Default: get words from the first chapter
    wordsPool = vocabularyData.chapters[0].words;
    
    // Filter out mastered words unless they were incorrect (for logged-in users)
    wordsPool = filterMasteredWords(wordsPool, req.query.username);
  }
  
  // No words available and no selected word
  if (wordsPool.length === 0 && !selectedWord) {
    return res.status(404).json({ error: 'No words available for practice' });
  }
  
  // Use selectedWord if we have one (from incorrect answers), otherwise pick from the pool sequentially
  let wordToUse;
  if (selectedWord) {
    wordToUse = selectedWord;
  } else {
    // Instead of random selection, use sequential selection based on the position in the array
    // This ensures we go through vocabulary in the intended order
    let wordIndex = 0;
    
    // If user has progress, use it to determine the next word position
    if (req.query.username && global.usedWordsTracker[req.query.username]) {
      const history = global.usedWordsTracker[req.query.username].wordHistory;
      if (history.length > 0) {
        // Find the position of the last used word from this pool
        const lastWordLatinForm = history[history.length - 1];
        const lastWordIndex = wordsPool.findIndex(w => w.latin === lastWordLatinForm);
        
        // Move to next word, or circle back to the beginning if at the end
        wordIndex = (lastWordIndex + 1) % wordsPool.length;
      }
    }
    
    wordToUse = wordsPool[wordIndex];
  }
  
  // Add word to used history if user is logged in
  if (req.query.username && wordToUse) {
    // Keep track of the last 10 words used (or other appropriate limit)
    const history = global.usedWordsTracker[req.query.username].wordHistory;
    history.push(wordToUse.latin);
    
    // Keep only the 10 most recent words
    if (history.length > 10) {
      history.shift();
    }
  }
  
  // Determine question format: multiple-choice or fill-in-the-blank
  const format = questionFormat || (Math.random() > 0.5 ? 'multiple-choice' : 'fill-in-the-blank');
  
  // Determine direction: latin-to-english or english-to-latin
  const direction = Math.random() > 0.5 ? 'latin-to-english' : 'english-to-latin';
  
  let question;
  
  if (format === 'multiple-choice') {
    // For latin-to-english, use English distractors
    if (direction === 'latin-to-english') {
      // Get all words from vocabulary except the current word
      const distractorPool = [];
      vocabularyData.chapters.forEach(chapter => {
        distractorPool.push(...chapter.words.filter(w => w.latin !== wordToUse.latin));
      });
      
      // Generate unique options using our function
      const options = generateUniqueOptions(wordToUse.english, distractorPool, direction, 'english');
      
      // Ask for the English translation of a Latin word
      question = {
        format: 'multiple-choice',
        type: direction,
        questionText: `What is the English translation of "${wordToUse.latin}"?`,
        latinWord: wordToUse.latin,
        correctAnswer: wordToUse.english,
        options: options,
        latinSentence: wordToUse.latinSentence,
        englishSentence: wordToUse.englishSentence,
        optionsCount: options.length,
        uniqueOptions: new Set(options).size  // Should be the same as options.length
      };
    } else {
      // Ask for the Latin translation of an English word
      // Get all words from vocabulary except the current word
      const distractorPool = [];
      vocabularyData.chapters.forEach(chapter => {
        distractorPool.push(...chapter.words.filter(w => w.latin !== wordToUse.latin));
      });
      
      // Generate unique options using our function
      const options = generateUniqueOptions(wordToUse.latin, distractorPool, direction, 'latin');
      
      question = {
        format: 'multiple-choice',
        type: direction,
        questionText: `What is the Latin translation of "${wordToUse.english}"?`,
        englishWord: wordToUse.english,
        correctAnswer: wordToUse.latin,
        options: options,
        latinSentence: wordToUse.latinSentence,
        englishSentence: wordToUse.englishSentence,
        optionsCount: options.length,
        uniqueOptions: new Set(options).size  // Should be the same as options.length
      };
    }
  } else {
    // Fill-in-the-blank format
    if (direction === 'latin-to-english') {
      // Create a cloze with English translation (blank)
      const fullSentence = wordToUse.englishSentence;
      const wordToReplace = wordToUse.english;
      
      // Replace the word with a blank (handle multiple forms of the word by checking if it contains the word)
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
      // Create a cloze with Latin translation (blank)
      const fullSentence = wordToUse.latinSentence;
      const wordToReplace = wordToUse.latin;
      
      // Replace the word with a blank
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
  
  // Final verification of option uniqueness before sending the response
  if (question.format === 'multiple-choice' && question.options) {
    // Handle edge case where all options are identical (happens with some words like "canis")
    const allSame = question.options.every(opt => 
      opt.toLowerCase() === question.correctAnswer.toLowerCase());
    
    if (allSame) {
      console.warn('CRITICAL: All options are the same! Creating synthetic alternatives.');
      
      // Create completely new options based on the correct answer
      const correctAnswer = question.correctAnswer;
      const finalOptions = [correctAnswer];
      
      // Generate alternatives based on the type
      const prefix = direction === 'latin-to-english' ? 
        ['another ', 'alternate ', 'different '] : 
        ['alterum-', 'aliud-', 'novum-'];
      
      // Add prefixed versions
      for (let i = 0; i < 3; i++) {
        finalOptions.push(`${prefix[i]}${correctAnswer}`);
      }
      
      // Update the question
      question.options = finalOptions.sort(() => 0.5 - Math.random());
      question.optionsCount = finalOptions.length;
      question.uniqueOptions = finalOptions.length;
      
      console.log('Generated synthetic alternatives:', finalOptions);
      return res.json(question);
    }
    
    // Get all unique options
    const uniqueOptions = [...new Set(question.options.map(opt => opt.toLowerCase()))];
    
    // If we don't have enough unique options, recreate them from scratch
    if (uniqueOptions.length < 4) {
      console.warn(`CRITICAL: Still have duplicate options after all processing! ${uniqueOptions.length} unique out of ${question.options.length}`);
      
      // Start with only the correct answer
      const finalOptions = [question.correctAnswer];
      const usedValues = new Set([question.correctAnswer.toLowerCase()]);
      
      // Add some of the current options that aren't duplicates
      for (const option of question.options) {
        if (!usedValues.has(option.toLowerCase())) {
          finalOptions.push(option);
          usedValues.add(option.toLowerCase());
          
          // Break if we have 4 options
          if (finalOptions.length === 4) break;
        }
      }
      
      // If still not enough, add fallback options
      if (finalOptions.length < 4) {
        // Add fallback options - use more descriptive alternatives
        if (direction === 'latin-to-english') {
          // English alternatives
          const alternatives = [
            `not a ${question.correctAnswer}`,
            `similar to ${question.correctAnswer}`,
            `kind of ${question.correctAnswer}`
          ];
          
          for (let i = 0; i < alternatives.length && finalOptions.length < 4; i++) {
            finalOptions.push(alternatives[i]);
          }
        } else {
          // Latin alternatives
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
      
      // Update the question options
      question.options = finalOptions.sort(() => 0.5 - Math.random());
      question.optionsCount = finalOptions.length;
      question.uniqueOptions = finalOptions.length;
      
      console.log('Final fixed options:', question.options);
    }
  }
  
  res.json(question);
});

// Submit an answer
app.post('/api/practice/submit-answer', (req, res) => {
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
    global.usedWordsTracker[username].incorrectWords.delete(latinWord);
  } else {
    usersData.users[userIndex].vocabProgress[latinWord].incorrectCount += 1;
    // Add to incorrect words to retry later
    global.usedWordsTracker[username].incorrectWords.add(latinWord);
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
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
  console.log(`Access locally via http://localhost:${PORT}`);
  console.log(`Access from other devices via http://YOUR_IP_ADDRESS:${PORT}`);
  console.log(`Vocabulary files:`);
  Object.entries(VOCABULARY_FILES).forEach(([book, file]) => {
    console.log(`  ${book}: ${file}`);
  });
  console.log(`Users file: ${USERS_FILE}`);
});