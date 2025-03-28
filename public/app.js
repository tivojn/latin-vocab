// Vocabulary List Functions
async function showWeakWords(e) {
  e.preventDefault();
  
  if (!appState.currentUser) {
    showError('Please log in to view your weak words.');
    return;
  }
  
  try {
    // Fetch user progress data
    const progressData = await fetchUserProgress(appState.currentUser);
    
    if (!progressData || !progressData.vocabProgress) {
      throw new Error('Failed to fetch user progress');
    }
    
    // Get weak words (low accuracy rate, below 70%)
    const weakWords = [];
    
    // Fetch all chapters to get word details
    const allWords = await getAllVocabularyWords();
    
    // Filter for weak words (more than 30% incorrect)
    for (const [latinWord, progress] of Object.entries(progressData.vocabProgress)) {
      const { correctCount, incorrectCount } = progress;
      const total = correctCount + incorrectCount;
      
      // Consider as weak if total attempts > 2 and at least 30% incorrect
      if (total > 2 && (incorrectCount / total) >= 0.3) {
        // Find the word details in allWords
        const wordData = allWords.find(word => word.latin === latinWord);
        if (wordData) {
          const accuracy = total > 0 ? (correctCount / total) * 100 : 0;
          weakWords.push({
            ...wordData,
            accuracy: accuracy.toFixed(1) + '%',
            attempts: total,
            errorRate: ((incorrectCount / total) * 100).toFixed(1) + '%'
          });
        }
      }
    }
    
    // Set the modal title
    elements.vocabListTitle.textContent = `Weak Words (${weakWords.length})`;
    
    // Populate the vocabulary list
    elements.vocabListContent.innerHTML = '';
    
    if (weakWords.length === 0) {
      elements.vocabListContent.innerHTML = '<div class="p-4 text-gray-500">You don\'t have any weak words yet. Keep practicing!</div>';
    } else {
      // Create a table for better presentation
      const table = document.createElement('table');
      table.className = 'min-w-full divide-y divide-gray-200';
      table.innerHTML = `
        <thead>
          <tr>
            <th class="px-4 py-2 text-left text-purple-600 font-bold">Latin</th>
            <th class="px-4 py-2 text-left text-purple-600 font-bold">English</th>
            <th class="px-4 py-2 text-left text-purple-600 font-bold">Accuracy</th>
            <th class="px-4 py-2 text-left text-purple-600 font-bold">Error Rate</th>
          </tr>
        </thead>
        <tbody>
          ${weakWords.map((word, index) => `
            <tr class="${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}">
              <td class="px-4 py-2 font-medium">${word.latin}</td>
              <td class="px-4 py-2">${word.english}</td>
              <td class="px-4 py-2">${word.accuracy}</td>
              <td class="px-4 py-2 text-red-500">${word.errorRate}</td>
            </tr>
          `).join('')}
        </tbody>
      `;
      
      elements.vocabListContent.appendChild(table);
    }
    
    // Show the modal
    elements.vocabListContainer.classList.remove('hidden');
  } catch (error) {
    debugLog.error('showWeakWords', 'Error fetching weak words', { 
      message: error.message, 
      stack: error.stack 
    });
    showError('Failed to load weak words. Please try again.');
  }
}

async function showChapterVocabulary(e) {
  e.preventDefault();
  
  if (!appState.selectedChapter) {
    showError('Please select a chapter first.');
    return;
  }
  
  try {
    // Fetch chapter data
    const response = await fetch(`/api/vocabulary/chapters/${appState.selectedChapter}?book=${appState.selectedBook}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch chapter vocabulary');
    }
    
    const chapterData = await response.json();
    debugLog.success('showChapterVocabulary', 'Chapter data received', chapterData);
    
    // Set the modal title
    elements.vocabListTitle.textContent = `Chapter ${chapterData.chapterNumber}: ${chapterData.chapterTitle}`;
    
    // Populate the vocabulary list
    elements.vocabListContent.innerHTML = '';
    
    if (!chapterData.words || chapterData.words.length === 0) {
      elements.vocabListContent.innerHTML = '<div class="p-4 text-gray-500">No vocabulary words found for this chapter.</div>';
    } else {
      // Create a table for better presentation
      const table = document.createElement('table');
      table.className = 'min-w-full divide-y divide-gray-200';
      table.innerHTML = `
        <thead>
          <tr>
            <th class="px-4 py-2 text-left text-purple-600 font-bold">Latin</th>
            <th class="px-4 py-2 text-left text-purple-600 font-bold">English</th>
          </tr>
        </thead>
        <tbody>
          ${chapterData.words.map((word, index) => `
            <tr class="${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}">
              <td class="px-4 py-2 font-medium">${word.latin}</td>
              <td class="px-4 py-2">${word.english}</td>
            </tr>
          `).join('')}
        </tbody>
      `;
      
      elements.vocabListContent.appendChild(table);
    }
    
    // Show the modal
    elements.vocabListContainer.classList.remove('hidden');
  } catch (error) {
    debugLog.error('showChapterVocabulary', 'Error fetching chapter vocabulary', { 
      message: error.message, 
      stack: error.stack 
    });
    showError('Failed to load chapter vocabulary. Please try again.');
  }
}

async function showMasteredWords(e) {
  e.preventDefault();
  
  if (!appState.currentUser) {
    showError('Please log in to view your mastered words.');
    return;
  }
  
  try {
    // Fetch user progress data
    const progressData = await fetchUserProgress(appState.currentUser);
    
    if (!progressData || !progressData.vocabProgress) {
      throw new Error('Failed to fetch user progress');
    }
    
    // Get mastered words (at least 3 correct and 75% accuracy)
    const masteredWords = [];
    
    // Fetch all chapters to get word details
    const allWords = await getAllVocabularyWords();
    
    // Filter for mastered words
    for (const [latinWord, progress] of Object.entries(progressData.vocabProgress)) {
      const { correctCount, incorrectCount } = progress;
      const total = correctCount + incorrectCount;
      const accuracy = total > 0 ? correctCount / total : 0;
      
      if (correctCount >= 3 && accuracy >= 0.75) {
        // Find the word details in allWords
        const wordData = allWords.find(word => word.latin === latinWord);
        if (wordData) {
          masteredWords.push({
            ...wordData,
            accuracy: (accuracy * 100).toFixed(1) + '%',
            attempts: total
          });
        }
      }
    }
    
    // Set the modal title
    elements.vocabListTitle.textContent = `Mastered Words (${masteredWords.length})`;
    
    // Populate the vocabulary list
    elements.vocabListContent.innerHTML = '';
    
    if (masteredWords.length === 0) {
      elements.vocabListContent.innerHTML = '<div class="p-4 text-gray-500">You haven\'t mastered any words yet. Keep practicing!</div>';
    } else {
      // Create a table for better presentation
      const table = document.createElement('table');
      table.className = 'min-w-full divide-y divide-gray-200';
      table.innerHTML = `
        <thead>
          <tr>
            <th class="px-4 py-2 text-left text-purple-600 font-bold">Latin</th>
            <th class="px-4 py-2 text-left text-purple-600 font-bold">English</th>
            <th class="px-4 py-2 text-left text-purple-600 font-bold">Accuracy</th>
          </tr>
        </thead>
        <tbody>
          ${masteredWords.map((word, index) => `
            <tr class="${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}">
              <td class="px-4 py-2 font-medium">${word.latin}</td>
              <td class="px-4 py-2">${word.english}</td>
              <td class="px-4 py-2">${word.accuracy}</td>
            </tr>
          `).join('')}
        </tbody>
      `;
      
      elements.vocabListContent.appendChild(table);
    }
    
    // Show the modal
    elements.vocabListContainer.classList.remove('hidden');
  } catch (error) {
    debugLog.error('showMasteredWords', 'Error fetching mastered words', { 
      message: error.message, 
      stack: error.stack 
    });
    showError('Failed to load mastered words. Please try again.');
  }
}

async function showLearningWords(e) {
  e.preventDefault();
  
  if (!appState.currentUser) {
    showError('Please log in to view your learning words.');
    return;
  }
  
  try {
    // Fetch user progress data
    const progressData = await fetchUserProgress(appState.currentUser);
    
    if (!progressData || !progressData.vocabProgress) {
      throw new Error('Failed to fetch user progress');
    }
    
    // Get learning words (practiced but not yet mastered)
    const learningWords = [];
    
    // Fetch all chapters to get word details
    const allWords = await getAllVocabularyWords();
    
    // Filter for learning words
    for (const [latinWord, progress] of Object.entries(progressData.vocabProgress)) {
      const { correctCount, incorrectCount } = progress;
      const total = correctCount + incorrectCount;
      const accuracy = total > 0 ? correctCount / total : 0;
      
      if (total > 0 && !(correctCount >= 3 && accuracy >= 0.75)) {
        // Find the word details in allWords
        const wordData = allWords.find(word => word.latin === latinWord);
        if (wordData) {
          learningWords.push({
            ...wordData,
            accuracy: (accuracy * 100).toFixed(1) + '%',
            attempts: total
          });
        }
      }
    }
    
    // Set the modal title
    elements.vocabListTitle.textContent = `Learning Words (${learningWords.length})`;
    
    // Populate the vocabulary list
    elements.vocabListContent.innerHTML = '';
    
    if (learningWords.length === 0) {
      elements.vocabListContent.innerHTML = '<div class="p-4 text-gray-500">You don\'t have any words in progress. Start practicing!</div>';
    } else {
      // Create a table for better presentation
      const table = document.createElement('table');
      table.className = 'min-w-full divide-y divide-gray-200';
      table.innerHTML = `
        <thead>
          <tr>
            <th class="px-4 py-2 text-left text-purple-600 font-bold">Latin</th>
            <th class="px-4 py-2 text-left text-purple-600 font-bold">English</th>
            <th class="px-4 py-2 text-left text-purple-600 font-bold">Accuracy</th>
          </tr>
        </thead>
        <tbody>
          ${learningWords.map((word, index) => `
            <tr class="${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}">
              <td class="px-4 py-2 font-medium">${word.latin}</td>
              <td class="px-4 py-2">${word.english}</td>
              <td class="px-4 py-2">${word.accuracy}</td>
            </tr>
          `).join('')}
        </tbody>
      `;
      
      elements.vocabListContent.appendChild(table);
    }
    
    // Show the modal
    elements.vocabListContainer.classList.remove('hidden');
  } catch (error) {
    debugLog.error('showLearningWords', 'Error fetching learning words', { 
      message: error.message, 
      stack: error.stack 
    });
    showError('Failed to load learning words. Please try again.');
  }
}

function hideVocabList() {
  elements.vocabListContainer.classList.add('hidden');
}

// Helper function to get all vocabulary words from all chapters
async function getAllVocabularyWords() {
  try {
    // Fetch all chapters
    const response = await fetch(`/api/vocabulary/chapters?book=${appState.selectedBook}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch chapters');
    }
    
    const chapters = await response.json();
    
    // Collect all words from all chapters
    let allWords = [];
    
    // For each chapter, fetch its words
    for (const chapter of chapters) {
      const chapterResponse = await fetch(`/api/vocabulary/chapters/${chapter.chapterNumber}?book=${appState.selectedBook}`);
      
      if (chapterResponse.ok) {
        const chapterData = await chapterResponse.json();
        
        if (chapterData.words && chapterData.words.length > 0) {
          // Add chapter number to each word
          const wordsWithChapter = chapterData.words.map(word => ({
            ...word,
            chapterNumber: chapter.chapterNumber
          }));
          
          allWords = [...allWords, ...wordsWithChapter];
        }
      }
    }
    
    return allWords;
  } catch (error) {
    debugLog.error('getAllVocabularyWords', 'Error fetching all vocabulary words', { 
      message: error.message, 
      stack: error.stack 
    });
    return [];
  }
}// State management
const appState = {
  currentUser: null,
  selectedBook: 'bk1', // Default to Book 1
  selectedChapter: null,
  currentQuestion: null,
  chapters: [],
  books: [],
  practiceMode: null,
  questionFormat: 'multiple-choice'
};

// Debug Logging - Added for troubleshooting
const debugLog = {
  addLog(type, action, message, data) {
    try {
      // Get current logs
      const logs = JSON.parse(localStorage.getItem('latinVocabDebugLog') || '[]');
      
      // Add new log entry
      logs.push({
        timestamp: new Date().toISOString(),
        type, // 'error', 'warning', 'info', 'success'
        action,
        message,
        data
      });
      
      // Keep only the last 100 logs
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100);
      }
      
      // Save logs
      localStorage.setItem('latinVocabDebugLog', JSON.stringify(logs));
    } catch (e) {
      console.error('Error logging to debug system:', e);
    }
  },
  
  error(action, message, data) {
    console.error(`ERROR [${action}]:`, message, data);
    this.addLog('error', action, message, data);
  },
  
  warning(action, message, data) {
    console.warn(`WARNING [${action}]:`, message, data);
    this.addLog('warning', action, message, data);
  },
  
  info(action, message, data) {
    console.log(`INFO [${action}]:`, message, data);
    this.addLog('info', action, message, data);
  },
  
  success(action, message, data) {
    console.log(`SUCCESS [${action}]:`, message, data);
    this.addLog('success', action, message, data);
  }
};

// DOM Elements
const elements = {
  // User section
  loginForm: document.getElementById('login-form'),
  userInfo: document.getElementById('user-info'),
  usernameInput: document.getElementById('username-input'),
  loginBtn: document.getElementById('login-btn'),
  logoutBtn: document.getElementById('logout-btn'),
  currentUserSpan: document.getElementById('current-user'),
  
  // Books and Chapters
  bookSelect: document.getElementById('book-select'),
  chapterSelect: document.getElementById('chapter-select'),
  
  // Progress section
  progressSection: document.getElementById('progress-section'),
  currentChapterSpan: document.getElementById('current-chapter'),
  masteredCountSpan: document.getElementById('mastered-count'),
  learningCountSpan: document.getElementById('learning-count'),
  weakWordsCountSpan: document.getElementById('weak-words-count'),
  masteredWordsLink: document.getElementById('mastered-words-link'),
  learningWordsLink: document.getElementById('learning-words-link'),
  weakWordsLink: document.getElementById('weak-words-link'),
  chapterVocabLink: document.getElementById('chapter-vocab-link'),
  
  // Vocabulary Lists
  vocabListContainer: document.getElementById('vocab-list-container'),
  vocabListTitle: document.getElementById('vocab-list-title'),
  vocabListContent: document.getElementById('vocab-list-content'),
  closeVocabListBtn: document.getElementById('close-vocab-list-btn'),
  
  // Practice options
  practiceChapterBtn: document.getElementById('practice-chapter-btn'),
  practiceWeakBtn: document.getElementById('practice-weak-btn'),
  multipleChoiceBtn: document.getElementById('multiple-choice-btn'),
  fillInBlankBtn: document.getElementById('fill-in-blank-btn'),
  
  // Content areas
  welcomeCard: document.getElementById('welcome-card'),
  quizContainer: document.getElementById('quiz-container'),
  
  // Quiz elements
  questionText: document.getElementById('question-text'),
  optionsContainer: document.getElementById('options-container'),
  fillBlankContainer: document.getElementById('fill-blank-container'),
  feedbackContainer: document.getElementById('feedback-container'),
  sentenceExample: document.getElementById('sentence-example'),
  latinSentence: document.getElementById('latin-sentence'),
  englishSentence: document.getElementById('english-sentence'),
  nextQuestionBtn: document.getElementById('next-question-btn')
};

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  console.log('App initialized');
  
  // Set initial book selection dropdown value
  elements.bookSelect.value = appState.selectedBook;
  
  // User login/logout
  elements.loginBtn.addEventListener('click', handleLogin);
  elements.logoutBtn.addEventListener('click', handleLogout);
  
  // Allow Enter key to submit login
  elements.usernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  });
  
  // Book and chapter selection
  elements.bookSelect.addEventListener('change', handleBookSelection);
  elements.chapterSelect.addEventListener('change', handleChapterSelection);
  
  // Practice modes
  elements.practiceChapterBtn.addEventListener('click', () => startPractice('chapter'));
  elements.practiceWeakBtn.addEventListener('click', () => startPractice('weak-words'));
  
  // Question format toggle
  elements.multipleChoiceBtn.addEventListener('click', () => {
    setQuestionFormat('multiple-choice');
  });
  
  elements.fillInBlankBtn.addEventListener('click', () => {
    setQuestionFormat('fill-in-the-blank');
  });
  
  // Next question button
  elements.nextQuestionBtn.addEventListener('click', fetchNextQuestion);
  
  // Allow Enter key to get next question
  document.addEventListener('keypress', (e) => {
    // Only trigger if feedback is shown (meaning the question was answered)
    // and quiz container is visible (not on welcome screen)
    if (e.key === 'Enter' && 
        !elements.quizContainer.classList.contains('hidden') && 
        !elements.feedbackContainer.classList.contains('hidden')) {
      fetchNextQuestion();
    }
  });
  
  // Vocabulary list links
  elements.chapterVocabLink.addEventListener('click', showChapterVocabulary);
  elements.masteredWordsLink.addEventListener('click', showMasteredWords);
  elements.learningWordsLink.addEventListener('click', showLearningWords);
  elements.weakWordsLink.addEventListener('click', showWeakWords);
  elements.closeVocabListBtn.addEventListener('click', hideVocabList);
  
  // Load books and chapters on init
  fetchBooks();
  fetchChapters(appState.selectedBook);
});

// Function to set question format
function setQuestionFormat(format) {
  appState.questionFormat = format;
  
  // Update UI
  document.querySelectorAll('.format-toggle').forEach(btn => {
    btn.classList.remove('active');
  });
  
  if (format === 'multiple-choice') {
    elements.multipleChoiceBtn.classList.add('active');
  } else {
    elements.fillInBlankBtn.classList.add('active');
  }
}

// API Functions
async function fetchBooks() {
  try {
    debugLog.info('fetchBooks', 'Fetching books...');
    const response = await fetch('/api/vocabulary/books');
    
    if (!response.ok) {
      const errorText = await response.text();
      debugLog.error('fetchBooks', 'Failed to fetch books', { status: response.status, statusText: response.statusText, body: errorText });
      throw new Error('Failed to fetch books');
    }
    
    const books = await response.json();
    debugLog.success('fetchBooks', 'Books received', books);
    
    // Store books in app state
    appState.books = books;
    
    // Render books in dropdown (already populated in HTML with default values)
    // This part would be uncommented if you want to dynamically load books from the API
    /*
    renderBooks(books);
    */
  } catch (error) {
    debugLog.error('fetchBooks', 'Error fetching books', { message: error.message, stack: error.stack });
    // Books are hardcoded in HTML so we don't need a fallback
  }
}

async function fetchChapters(bookId) {
  try {
    debugLog.info('fetchChapters', `Fetching chapters for book ${bookId}...`);
    const response = await fetch(`/api/vocabulary/chapters?book=${bookId}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      debugLog.error('fetchChapters', 'Failed to fetch chapters', { status: response.status, statusText: response.statusText, body: errorText });
      throw new Error('Failed to fetch chapters');
    }
    
    const chapters = await response.json();
    debugLog.success('fetchChapters', 'Chapters received', { bookId, chapters });
    
    // Store chapters in app state
    appState.chapters = chapters;
    
    // Render chapters
    renderChapters(chapters);
  } catch (error) {
    debugLog.error('fetchChapters', 'Error fetching chapters', { message: error.message, stack: error.stack });
    showError('Failed to load chapters. Please try again later.');
    
    // Load fallback chapters
    renderFallbackChapters();
  }
}

// Render fallback chapters if API fails
function renderFallbackChapters() {
  let fallbackChapters = [];
  
  if (appState.selectedBook === 'bk1') {
    fallbackChapters = [
      { chapterNumber: 1, chapterTitle: "Cambridge Latin Course Book 1 - Checklist 1" },
      { chapterNumber: 2, chapterTitle: "Cambridge Latin Course Book 1 - Checklist 2" },
      { chapterNumber: 3, chapterTitle: "Cambridge Latin Course Book 1 - Checklist 3" },
      { chapterNumber: 4, chapterTitle: "Cambridge Latin Course Book 1 - Checklist 4" },
      { chapterNumber: 5, chapterTitle: "Cambridge Latin Course Book 1 - Checklist 5" },
      { chapterNumber: 6, chapterTitle: "Cambridge Latin Course Book 1 - Checklist 6" },
      { chapterNumber: 7, chapterTitle: "Cambridge Latin Course Book 1 - Checklist 7" },
      { chapterNumber: 8, chapterTitle: "Cambridge Latin Course Book 1 - Checklist 8" },
      { chapterNumber: 9, chapterTitle: "Cambridge Latin Course Book 1 - Checklist 9" },
      { chapterNumber: 10, chapterTitle: "Cambridge Latin Course Book 1 - Checklist 10" },
      { chapterNumber: 11, chapterTitle: "Cambridge Latin Course Book 1 - Checklist 11" },
      { chapterNumber: 12, chapterTitle: "Cambridge Latin Course Book 1 - Checklist 12" }
    ];
  } else {
    fallbackChapters = [
      { chapterNumber: 13, chapterTitle: "Cambridge Latin Course Book 2 - Checklist 13" },
      { chapterNumber: 14, chapterTitle: "Cambridge Latin Course Book 2 - Checklist 14" },
      { chapterNumber: 15, chapterTitle: "Cambridge Latin Course Book 2 - Checklist 15" },
      { chapterNumber: 16, chapterTitle: "Cambridge Latin Course Book 2 - Checklist 16" },
      { chapterNumber: 17, chapterTitle: "Cambridge Latin Course Book 2 - Checklist 17" },
      { chapterNumber: 18, chapterTitle: "Cambridge Latin Course Book 2 - Checklist 18" },
      { chapterNumber: 19, chapterTitle: "Cambridge Latin Course Book 2 - Checklist 19" },
      { chapterNumber: 20, chapterTitle: "Cambridge Latin Course Book 2 - Checklist 20" }
    ];
  }
  
  appState.chapters = fallbackChapters;
  renderChapters(fallbackChapters);
}

// Handle book selection
function handleBookSelection() {
  const selectedBook = elements.bookSelect.value;
  console.log(`Book selected: ${selectedBook}`);
  
  // Update state
  appState.selectedBook = selectedBook;
  appState.selectedChapter = null; // Reset chapter selection when book changes
  
  // Reset chapter dropdown
  elements.chapterSelect.innerHTML = '<option value="">Loading chapters...</option>';
  
  // Fetch chapters for new book
  fetchChapters(selectedBook);
}

// Handle chapter selection
function handleChapterSelection() {
  const selectedChapter = parseInt(elements.chapterSelect.value, 10);
  console.log(`Chapter selected: ${selectedChapter}`);
  
  if (!isNaN(selectedChapter)) {
    // Update state
    appState.selectedChapter = selectedChapter;
    
    // Update the current chapter display in Your Progress section
    elements.currentChapterSpan.textContent = selectedChapter;
  } else {
    // If no chapter is selected (e.g., the default 'Select a chapter...' option)
    appState.selectedChapter = null;
  }
}

// Fetch next question
async function fetchNextQuestion() {
  try {
    // Hide previous feedback
    elements.feedbackContainer.classList.add('hidden');
    elements.sentenceExample.classList.add('hidden');
    
    // Show loading state
    elements.questionText.textContent = 'Loading question...';
    elements.optionsContainer.innerHTML = '';
    elements.fillBlankContainer.innerHTML = '';
    
    // Create query parameters
    let queryParams = `?questionFormat=${appState.questionFormat}`;
    
    // Always include the book parameter
    queryParams += `&book=${appState.selectedBook}`;
    
    if (appState.practiceMode === 'chapter' && appState.selectedChapter) {
      queryParams += `&chapter=${appState.selectedChapter}`;
    } else if (appState.practiceMode === 'weak-words' && appState.currentUser) {
      queryParams += `&mode=weak-words&username=${appState.currentUser}`;
    } else if (appState.currentUser) {
      queryParams += `&username=${appState.currentUser}`;
    }
    
    debugLog.info('fetchNextQuestion', 'Fetching next question', { queryParams });
    const response = await fetch(`/api/practice/next-question${queryParams}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      debugLog.error('fetchNextQuestion', 'Failed to fetch question', { status: response.status, statusText: response.statusText, body: errorText });
      throw new Error('Failed to fetch question');
    }
    
    const question = await response.json();
    debugLog.success('fetchNextQuestion', 'Question received', question);
    
    // Store current question
    appState.currentQuestion = question;
    
    // Render question
    renderQuestion(question);
  } catch (error) {
    debugLog.error('fetchNextQuestion', 'Error fetching question', { message: error.message, stack: error.stack });
    showError('Failed to load question. Please try again later.');
  }
}

// Submit answer
async function submitAnswer(selectedAnswer, format) {
  if (!appState.currentUser || !appState.currentQuestion) {
    debugLog.warning('submitAnswer', 'Cannot submit without user or question', { user: !!appState.currentUser, question: !!appState.currentQuestion });
    showError('Please log in and start a quiz first.');
    return;
  }
  
  try {
    // Log the question structure for debugging
    debugLog.info('submitAnswer', 'Current question data', appState.currentQuestion);
    
    // Extract latinWord based on question type
    let latinWord = '';
    
    // Check different possible structures
    if (appState.currentQuestion.latinWord) {
      latinWord = appState.currentQuestion.latinWord;
    } else if (appState.currentQuestion.latin) {
      latinWord = appState.currentQuestion.latin;
    } else if (appState.currentQuestion.type === 'english-to-latin') {
      // If English to Latin, the correctAnswer contains the Latin word
      latinWord = appState.currentQuestion.correctAnswer;
    } else if (appState.currentQuestion.type === 'latin-to-english') {
      // If Latin to English, the englishWord contains the Latin word we're asking about
      latinWord = appState.currentQuestion.englishWord || appState.currentQuestion.latin || '';
    }
    
    // Final fallback - use correctAnswer as the latinWord
    if (!latinWord && appState.currentQuestion.correctAnswer) {
      latinWord = appState.currentQuestion.correctAnswer;
    }
    
    if (!latinWord) {
      debugLog.error('submitAnswer', 'Missing latinWord in current question', appState.currentQuestion);
      showError('Cannot submit answer: missing word data. Please try another question.');
      return;
    }
    
    const requestData = {
      username: appState.currentUser,
      latinWord: latinWord,
      userAnswer: selectedAnswer,
      format: format || 'multiple-choice',
      book: appState.selectedBook
    };
    
    debugLog.info('submitAnswer', 'Submitting answer', requestData);
    
    const response = await fetch('/api/practice/submit-answer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });
    
    // Log the complete response for debugging
    const responseText = await response.text();
    let responseData;
    try {
      // Try to parse response as JSON
      responseData = JSON.parse(responseText);
    } catch (e) {
      // If not JSON, store as text
      responseData = { text: responseText };
    }
    
    if (!response.ok) {
      debugLog.error('submitAnswer', 'Failed to submit answer', { 
        status: response.status, 
        statusText: response.statusText, 
        responseData 
      });
      throw new Error('Failed to submit answer');
    }
    
    // If we get here, response was ok
    debugLog.success('submitAnswer', 'Answer submitted successfully', responseData);
    
    // Show feedback
    showFeedback(responseData);
  } catch (error) {
    debugLog.error('submitAnswer', 'Error submitting answer', { message: error.message, stack: error.stack });
    showError('Failed to submit answer. Please try again.');
  }
}

// UI Rendering Functions
function renderChapters(chapters) {
  const chapterSelect = elements.chapterSelect;
  chapterSelect.innerHTML = '<option value="">Select a chapter...</option>';
  
  if (!chapters || chapters.length === 0) {
    chapterSelect.innerHTML = '<option value="">No chapters available</option>';
    return;
  }
  
  chapters.forEach(chapter => {
    const option = document.createElement('option');
    option.value = chapter.chapterNumber;
    option.textContent = `Chapter ${chapter.chapterNumber}: ${chapter.chapterTitle}`;
    chapterSelect.appendChild(option);
  });
  
  // Select the previously selected chapter if it's available in the new book
  if (appState.selectedChapter) {
    const chapterExists = Array.from(chapterSelect.options).some(
      option => option.value === appState.selectedChapter.toString()
    );
    
    if (chapterExists) {
      chapterSelect.value = appState.selectedChapter;
    } else {
      appState.selectedChapter = null;
    }
  }
}

// Render question
function renderQuestion(question) {
  debugLog.info('renderQuestion', 'Rendering question', question);
  
  // Show quiz container and hide welcome card
  elements.welcomeCard.classList.add('hidden');
  elements.quizContainer.classList.remove('hidden');
  
  // Set question text
  elements.questionText.textContent = question.questionText;
  
  // Determine which container to show based on question format
  if (question.format === 'multiple-choice') {
    elements.optionsContainer.classList.remove('hidden');
    elements.fillBlankContainer.classList.add('hidden');
    renderMultipleChoiceQuestion(question);
  } else {
    elements.optionsContainer.classList.add('hidden');
    elements.fillBlankContainer.classList.remove('hidden');
    renderFillInBlankQuestion(question);
  }
}

// Render multiple-choice question
function renderMultipleChoiceQuestion(question) {
  debugLog.info('renderMultipleChoiceQuestion', 'Rendering multiple choice options', {
    options: question.options,
    correctAnswer: question.correctAnswer,
    optionsCount: question.optionsCount || (question.options ? question.options.length : 0),
    uniqueOptions: question.uniqueOptions || (question.options ? new Set(question.options).size : 0)
  });
  
  elements.optionsContainer.innerHTML = '';
  
  // Check if options array exists and is not empty
  if (!question.options || question.options.length === 0) {
    debugLog.error('renderMultipleChoiceQuestion', 'No options provided for multiple choice question', question);
    showError('Question data is incomplete. Please try another question.');
    return;
  }
  
  // Check for duplicate options
  const uniqueOptions = new Set(question.options);
  if (uniqueOptions.size !== question.options.length) {
    debugLog.warning('renderMultipleChoiceQuestion', 'Duplicate options detected in question', {
      options: question.options,
      uniqueCount: uniqueOptions.size
    });
    // We don't need to do anything special here since the server should now handle uniqueness
  }
  
  question.options.forEach((option, index) => {
    const optionBtn = document.createElement('button');
    optionBtn.classList.add('option-btn');
    optionBtn.textContent = option;
    optionBtn.dataset.index = index;
    
    // Add click event
    optionBtn.addEventListener('click', () => {
      // Prevent multiple submissions
      if (elements.feedbackContainer.classList.contains('hidden')) {
        // Visual selection
        document.querySelectorAll('.option-btn').forEach(btn => {
          btn.classList.remove('selected');
        });
        optionBtn.classList.add('selected');
        
        debugLog.info('renderMultipleChoiceQuestion', 'Option selected', {
          selectedOption: option,
          optionIndex: index,
          correctAnswer: question.correctAnswer,
          isCorrect: option === question.correctAnswer
        });
        
        // Submit answer
        submitAnswer(option, 'multiple-choice');
      }
    });
    
    elements.optionsContainer.appendChild(optionBtn);
  });
}

// Render fill-in-the-blank question
function renderFillInBlankQuestion(question) {
  debugLog.info('renderFillInBlankQuestion', 'Rendering fill-in-blank question', {
    sentence: question.sentence,
    correctAnswer: question.correctAnswer
  });
  
  elements.fillBlankContainer.innerHTML = '';
  
  // Create sentence display
  const sentenceDiv = document.createElement('div');
  sentenceDiv.classList.add('cloze-sentence');
  sentenceDiv.textContent = question.sentence || 'Fill in the blank with the correct answer.';
  
  // Create input container
  const inputContainer = document.createElement('div');
  
  // Create text input
  const input = document.createElement('input');
  input.type = 'text';
  input.id = 'answer-input';
  input.classList.add('text-input');
  input.placeholder = 'Your answer';
  
  // Create submit button
  const submitBtn = document.createElement('button');
  submitBtn.classList.add('submit-btn');
  submitBtn.textContent = 'Submit Answer';
  
  // Add submit event
  const submitAnswerFn = () => {
    const answer = input.value.trim();
    if (answer) {
      debugLog.info('renderFillInBlankQuestion', 'Submitting fill-in-blank answer', {
        userAnswer: answer,
        correctAnswer: question.correctAnswer,
        isCorrect: answer.toLowerCase() === question.correctAnswer.toLowerCase()
      });
      
      // Disable input and button
      input.disabled = true;
      submitBtn.disabled = true;
      submitBtn.classList.add('disabled');
      
      // Submit answer
      submitAnswer(answer, 'fill-in-the-blank');
    } else {
      debugLog.warning('renderFillInBlankQuestion', 'Empty answer attempted');
    }
  };
  
  submitBtn.addEventListener('click', submitAnswerFn);
  
  // Also submit on Enter key
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      submitAnswerFn();
    }
  });
  
  // Add elements to container
  inputContainer.appendChild(input);
  inputContainer.appendChild(submitBtn);
  
  // Add to fill-blank container
  elements.fillBlankContainer.appendChild(sentenceDiv);
  elements.fillBlankContainer.appendChild(inputContainer);
  
  // Focus on input
  setTimeout(() => input.focus(), 100);
}

// Show feedback after answering
function showFeedback(result) {
  debugLog.info('showFeedback', 'Showing feedback for answer', result);
  
  // Check for complete result data
  if (!result || typeof result !== 'object') {
    debugLog.error('showFeedback', 'Invalid feedback data received', result);
    showError('Error displaying feedback. Please try another question.');
    return;
  }
  
  const { correct, correctAnswer, latinWord, latinSentence, englishSentence } = result;
  
  // Show feedback container
  elements.feedbackContainer.classList.remove('hidden');
  elements.feedbackContainer.innerHTML = '';
  
  // Create feedback message
  const feedbackDiv = document.createElement('div');
  feedbackDiv.classList.add('feedback', correct ? 'correct' : 'incorrect');
  
  if (correct) {
    feedbackDiv.innerHTML = `
      <div class="flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
        </svg>
        <span class="font-medium">Correct! Great job!</span>
      </div>
    `;
  } else {
    feedbackDiv.innerHTML = `
      <div class="flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
        </svg>
        <span class="font-medium">Incorrect. The correct answer is: "${correctAnswer}"</span>
      </div>
    `;
    
    // Also mark the correct answer in options list for multiple choice
    if (appState.questionFormat === 'multiple-choice') {
      const options = document.querySelectorAll('.option-btn');
      let correctOptionFound = false;
      
      options.forEach(btn => {
        if (btn.textContent === correctAnswer) {
          btn.classList.add('correct');
          correctOptionFound = true;
        } else if (btn.classList.contains('selected')) {
          btn.classList.add('incorrect');
        }
      });
      
      if (!correctOptionFound) {
        debugLog.warning('showFeedback', 'Correct answer not found in options', {
          correctAnswer,
          options: Array.from(options).map(o => o.textContent)
        });
      }
    }
  }
  
  elements.feedbackContainer.appendChild(feedbackDiv);
  
  // Show example sentences if available
  if (latinSentence && englishSentence) {
    elements.sentenceExample.classList.remove('hidden');
    elements.latinSentence.textContent = latinSentence;
    elements.englishSentence.textContent = englishSentence;
  } else {
    debugLog.warning('showFeedback', 'Example sentences missing', { latinSentence, englishSentence });
  }
  
  // Update user progress after each question
  if (appState.currentUser) {
    fetchUserProgress(appState.currentUser);
  }
}

// Show error message
function showError(message) {
  debugLog.error('showError', message);
  
  // Use feedback container to show error
  elements.feedbackContainer.classList.remove('hidden');
  elements.feedbackContainer.innerHTML = '';
  
  const errorDiv = document.createElement('div');
  errorDiv.classList.add('feedback', 'incorrect');
  errorDiv.innerHTML = `
    <div class="flex items-center">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
      </svg>
      <span class="font-medium">${message}</span>
    </div>
  `;
  
  elements.feedbackContainer.appendChild(errorDiv);
}

// User Management Functions
async function handleLogin() {
  const username = elements.usernameInput.value.trim();
  
  if (!username) {
    showError('Please enter a username.');
    return;
  }
  
  try {
    const response = await fetch('/api/users/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username })
    });
    
    if (!response.ok) {
      throw new Error('Login failed');
    }
    
    const userData = await response.json();
    console.log('Login successful:', userData);
    
    // Update app state
    appState.currentUser = username;
    
    // Update UI
    updateUIAfterLogin(userData);
    
    // Select chapter 1 by default if none selected
    if (!appState.selectedChapter) {
      appState.selectedChapter = 1;
      
      // Find and select the first chapter
      const firstChapter = document.querySelector('.chapter-item');
      if (firstChapter) {
        firstChapter.classList.add('selected');
      }
    }
    
    // Load user progress
    fetchUserProgress(username);
  } catch (error) {
    console.error('Login error:', error);
    showError('Login failed. Please try again.');
  }
}

function handleLogout() {
  // Reset app state - keep selectedBook but reset other states
  appState.currentUser = null;
  
  // Reset UI
  elements.userInfo.classList.add('hidden');
  elements.loginForm.classList.remove('hidden');
  elements.usernameInput.value = '';
  elements.progressSection.classList.add('hidden');
  
  // Show welcome card and hide quiz
  elements.welcomeCard.classList.remove('hidden');
  elements.quizContainer.classList.add('hidden');
  
  // Clear feedback
  elements.feedbackContainer.classList.add('hidden');
}

function updateUIAfterLogin(userData) {
  // Update UI
  elements.loginForm.classList.add('hidden');
  elements.userInfo.classList.remove('hidden');
  elements.currentUserSpan.textContent = appState.currentUser;
  
  // Show progress section
  elements.progressSection.classList.remove('hidden');
  elements.currentChapterSpan.textContent = userData.chapterProgress || 1;
}

async function fetchUserProgress(username) {
  try {
    debugLog.info('fetchUserProgress', `Fetching progress for user: ${username}`);
    const response = await fetch(`/api/users/${username}/progress`);
    
    if (!response.ok) {
      const errorText = await response.text();
      debugLog.error('fetchUserProgress', 'Failed to fetch user progress', { 
        status: response.status, 
        statusText: response.statusText,
        body: errorText 
      });
      throw new Error('Failed to fetch user progress');
    }
    
    const progressData = await response.json();
    debugLog.success('fetchUserProgress', 'User progress received', progressData);
    
    // Update progress stats
    updateProgressStats(progressData);
    
    return progressData;
  } catch (error) {
    debugLog.error('fetchUserProgress', 'Error fetching user progress', { 
      message: error.message, 
      stack: error.stack 
    });
    return null;
  }
}

function updateProgressStats(progressData) {
  const { vocabProgress } = progressData;
  
  debugLog.info('updateProgressStats', 'Updating progress statistics', { progressData });
  
  if (!vocabProgress || typeof vocabProgress !== 'object') {
    debugLog.error('updateProgressStats', 'Invalid progress data', { vocabProgress });
    return;
  }
  
  // Count mastered words (at least 3 correct and 75% accuracy)
  let masteredCount = 0;
  let learningCount = 0;
  let weakWordsCount = 0;
  
  // Convert object to array of entries for easier debugging
  const progressEntries = Object.entries(vocabProgress);
  debugLog.info('updateProgressStats', `Processing ${progressEntries.length} vocabulary items`);
  
  progressEntries.forEach(([word, progress]) => {
    // Make sure progress has the expected structure
    if (!progress || typeof progress !== 'object' || 
        typeof progress.correctCount !== 'number' || 
        typeof progress.incorrectCount !== 'number') {
      debugLog.warning('updateProgressStats', `Invalid progress entry for word: ${word}`, { progress });
      return; // Skip this entry
    }
    
    const { correctCount, incorrectCount } = progress;
    const total = correctCount + incorrectCount;
    const accuracy = total > 0 ? correctCount / total : 0;
    
    if (correctCount >= 3 && accuracy >= 0.75) {
      masteredCount++;
    } else if (total > 0) {
      learningCount++;
    }
    
    // Track weak words (words with enough attempts and high error rate)
    if (total > 2 && (incorrectCount / total) >= 0.3) {
      weakWordsCount++;
    }
  });
  
  debugLog.info('updateProgressStats', 'Final counts', { masteredCount, learningCount, weakWordsCount });
  
  // Update UI
  elements.masteredCountSpan.textContent = masteredCount;
  elements.learningCountSpan.textContent = learningCount;
  elements.weakWordsCountSpan.textContent = weakWordsCount;
}

// Practice Functions
function startPractice(mode) {
  if (!appState.currentUser) {
    showError('Please log in first.');
    return;
  }
  
  if (mode === 'chapter') {
    if (!appState.selectedChapter) {
      showError('Please select a chapter from the dropdown first.');
      // Focus on the chapter select to help the user
      elements.chapterSelect.focus();
      return;
    }
  }
  
  // Set practice mode
  appState.practiceMode = mode;
  
  // Display mode in UI
  const modeDisplay = mode === 'chapter' 
    ? `${appState.selectedBook.toUpperCase()} Chapter ${appState.selectedChapter}` 
    : 'Weak Words';
  
  console.log(`Starting practice in ${modeDisplay} mode`);
  
  // Fetch first question
  fetchNextQuestion();
}