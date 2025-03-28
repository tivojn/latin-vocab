const { 
  readJsonFile, 
  VOCABULARY_FILES, 
  DEFAULT_BOOK, 
  USERS_FILE,
  generateUniqueOptions,
  filterMasteredWords
} = require('../utils');

// Initialize global tracker if it doesn't exist
if (typeof global.usedWordsTracker === 'undefined') {
  global.usedWordsTracker = {};
}

module.exports = (req, res) => {
  console.log('\n========== NEW QUESTION REQUEST ==========');
  console.log('Request query:', req.query);
  
  const { chapter, mode, questionFormat, book, username } = req.query;
  const vocabularyFile = VOCABULARY_FILES[book || DEFAULT_BOOK];
  const vocabularyData = readJsonFile(vocabularyFile);
  
  if (!vocabularyData) {
    return res.status(500).json({ error: 'Failed to read vocabulary data' });
  }
  
  let wordsPool = [];
  let selectedWord = null;
  let recentlyUsedWords = [];
  
  // If user is logged in, get or initialize their word history
  if (username) {
    if (!global.usedWordsTracker[username]) {
      global.usedWordsTracker[username] = {
        wordHistory: [], // List of recently used words (Latin forms)
        incorrectWords: new Set() // Set of words answered incorrectly
      };
    }
    
    recentlyUsedWords = global.usedWordsTracker[username].wordHistory;
  }
  
  // Different modes for selecting words
  if (mode === 'weak-words' && username) {
    // Get frequently mistaken words for this user
    const usersData = readJsonFile(USERS_FILE);
    if (!usersData) {
      return res.status(500).json({ error: 'Failed to read user data' });
    }
    
    const user = usersData.users.find(u => u.username === username);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if there are words that were recently answered incorrectly
    const incorrectWordSet = global.usedWordsTracker[username].incorrectWords;
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
      wordsPool = filterMasteredWords(wordsPool, username);
    
      // Filter out recently used words unless they were incorrect
      wordsPool = wordsPool.filter(word => !recentlyUsedWords.includes(word.latin));
        
      // If we've exhausted the word pool, reset and use all words
      if (wordsPool.length === 0) {
        console.log('Word pool exhausted, resetting history...');
        if (username) {
          global.usedWordsTracker[username].wordHistory = [];
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
    if (username) {
      const incorrectWordSet = global.usedWordsTracker[username].incorrectWords;
      
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
      wordsPool = filterMasteredWords(wordsPool, username);
      
      // Filter out recently used words for this user
      if (username && recentlyUsedWords.length > 0) {
        // Create a copy of the chapter words that haven't been recently used
        wordsPool = wordsPool.filter(word => !recentlyUsedWords.includes(word.latin));
        
        // If we've used all words, reset the history
        if (wordsPool.length === 0) {
          console.log('Chapter words exhausted, resetting history...');
          if (username) {
            global.usedWordsTracker[username].wordHistory = [];
          }
          // Restart with all chapter words, not including mastered ones
          wordsPool = selectedChapter.words;
          
          // Re-apply mastered word filtering
          wordsPool = filterMasteredWords(wordsPool, username);
        }
      }
    }
  } else {
    // Default: get words from the first chapter
    wordsPool = vocabularyData.chapters[0].words;
    
    // Filter out mastered words unless they were incorrect (for logged-in users)
    wordsPool = filterMasteredWords(wordsPool, username);
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
    if (username && global.usedWordsTracker[username]) {
      const history = global.usedWordsTracker[username].wordHistory;
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
  if (username && wordToUse) {
    // Keep track of the last 10 words used (or other appropriate limit)
    const history = global.usedWordsTracker[username].wordHistory;
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
      return res.status(200).json(question);
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
  
  res.status(200).json(question);
};
