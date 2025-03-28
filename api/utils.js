const fs = require('fs');
const path = require('path');

// Data file paths
const DATA_DIR = path.join(process.cwd());
const VOCABULARY_FILES = {
  'bk1': path.join(DATA_DIR, 'vocabulary-bk1.json'),
  'bk2': path.join(DATA_DIR, 'vocabulary-bk2.json')
};
const DEFAULT_BOOK = 'bk1';
const USERS_FILE = path.join(DATA_DIR, 'users.json');

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
    // Determine if the word is in the list of incorrect words
    const isIncorrect = global.usedWordsTracker && 
                        global.usedWordsTracker[username] && 
                        global.usedWordsTracker[username].incorrectWords && 
                        global.usedWordsTracker[username].incorrectWords.has(word.latin);
                        
    // Either the word is not mastered or it's recently incorrect
    return !masteredWords.includes(word.latin) || isIncorrect;
  });
  
  console.log(`Filtered out ${originalSize - filteredPool.length} mastered words. Pool size: ${filteredPool.length}`);
  return filteredPool;
}

// Initialize global tracker if it doesn't exist
if (typeof global.usedWordsTracker === 'undefined') {
  global.usedWordsTracker = {};
}

module.exports = {
  VOCABULARY_FILES,
  DEFAULT_BOOK,
  USERS_FILE,
  readJsonFile,
  writeJsonFile,
  generateUniqueOptions,
  filterMasteredWords
};
