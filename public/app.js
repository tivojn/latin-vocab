// State management
const appState = {
  currentUser: null,
  selectedChapter: null,
  currentQuestion: null,
  chapters: [],
  practiceMode: null,
  questionFormat: 'multiple-choice'
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
  
  // Chapters
  chaptersList: document.getElementById('chapters-list'),
  
  // Progress section
  progressSection: document.getElementById('progress-section'),
  currentChapterSpan: document.getElementById('current-chapter'),
  masteredCountSpan: document.getElementById('mastered-count'),
  learningCountSpan: document.getElementById('learning-count'),
  
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
  
  // User login/logout
  elements.loginBtn.addEventListener('click', handleLogin);
  elements.logoutBtn.addEventListener('click', handleLogout);
  
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
  
  // Load chapters on init
  fetchChapters();
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
async function fetchChapters() {
  try {
    console.log('Fetching chapters...');
    const response = await fetch('/api/vocabulary/chapters');
    
    if (!response.ok) {
      throw new Error('Failed to fetch chapters');
    }
    
    const chapters = await response.json();
    console.log('Chapters received:', chapters);
    
    // Store chapters in app state
    appState.chapters = chapters;
    
    // Render chapters
    renderChapters(chapters);
  } catch (error) {
    console.error('Error fetching chapters:', error);
    showError('Failed to load chapters. Please try again later.');
    
    // Load fallback chapters
    renderFallbackChapters();
  }
}

// Render fallback chapters if API fails
function renderFallbackChapters() {
  const fallbackChapters = [
    { chapterNumber: 1, chapterTitle: "House and Family" },
    { chapterNumber: 2, chapterTitle: "Daily Life and Objects" },
    { chapterNumber: 3, chapterTitle: "Cities and Places" }
  ];
  
  appState.chapters = fallbackChapters;
  renderChapters(fallbackChapters);
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
    
    if (appState.practiceMode === 'chapter' && appState.selectedChapter) {
      queryParams += `&chapter=${appState.selectedChapter}`;
    } else if (appState.practiceMode === 'weak-words' && appState.currentUser) {
      queryParams += `&mode=weak-words&username=${appState.currentUser}`;
    } else if (appState.currentUser) {
      queryParams += `&username=${appState.currentUser}`;
    }
    
    const response = await fetch(`/api/practice/next-question${queryParams}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch question');
    }
    
    const question = await response.json();
    console.log('Question received:', question);
    
    // Store current question
    appState.currentQuestion = question;
    
    // Render question
    renderQuestion(question);
  } catch (error) {
    console.error('Error fetching question:', error);
    showError('Failed to load question. Please try again later.');
  }
}

// Submit answer
async function submitAnswer(selectedAnswer, format) {
  if (!appState.currentUser || !appState.currentQuestion) {
    showError('Please log in and start a quiz first.');
    return;
  }
  
  try {
    const { latinWord } = appState.currentQuestion;
    
    const response = await fetch('/api/practice/submit-answer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: appState.currentUser,
        latinWord,
        userAnswer: selectedAnswer,
        format: format || 'multiple-choice'
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to submit answer');
    }
    
    const result = await response.json();
    console.log('Answer result:', result);
    
    // Show feedback
    showFeedback(result);
  } catch (error) {
    console.error('Error submitting answer:', error);
    showError('Failed to submit answer. Please try again.');
  }
}

// UI Rendering Functions
function renderChapters(chapters) {
  elements.chaptersList.innerHTML = '';
  
  if (!chapters || chapters.length === 0) {
    const message = document.createElement('div');
    message.classList.add('text-gray-500', 'text-center', 'py-4');
    message.textContent = 'No chapters available';
    elements.chaptersList.appendChild(message);
    return;
  }
  
  chapters.forEach(chapter => {
    const chapterElement = document.createElement('div');
    chapterElement.classList.add('chapter-item', 'mb-2');
    chapterElement.textContent = `Chapter ${chapter.chapterNumber}: ${chapter.chapterTitle}`;
    chapterElement.dataset.chapterNumber = chapter.chapterNumber;
    
    // Add click event
    chapterElement.addEventListener('click', () => {
      // Remove selection from all chapters
      document.querySelectorAll('.chapter-item').forEach(item => {
        item.classList.remove('selected');
      });
      
      // Select this chapter
      chapterElement.classList.add('selected');
      appState.selectedChapter = chapter.chapterNumber;
      console.log('Chapter selected:', chapter.chapterNumber);
    });
    
    elements.chaptersList.appendChild(chapterElement);
  });
}

// Render question
function renderQuestion(question) {
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
  elements.optionsContainer.innerHTML = '';
  
  question.options.forEach((option, index) => {
    const optionBtn = document.createElement('button');
    optionBtn.classList.add('option-btn');
    optionBtn.textContent = option;
    
    // Add click event
    optionBtn.addEventListener('click', () => {
      // Prevent multiple submissions
      if (elements.feedbackContainer.classList.contains('hidden')) {
        // Visual selection
        document.querySelectorAll('.option-btn').forEach(btn => {
          btn.classList.remove('selected');
        });
        optionBtn.classList.add('selected');
        
        // Submit answer
        submitAnswer(option, 'multiple-choice');
      }
    });
    
    elements.optionsContainer.appendChild(optionBtn);
  });
}

// Render fill-in-the-blank question
function renderFillInBlankQuestion(question) {
  elements.fillBlankContainer.innerHTML = '';
  
  // Create sentence display
  const sentenceDiv = document.createElement('div');
  sentenceDiv.classList.add('cloze-sentence');
  sentenceDiv.textContent = question.sentence;
  
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
      // Disable input and button
      input.disabled = true;
      submitBtn.disabled = true;
      submitBtn.classList.add('disabled');
      
      // Submit answer
      submitAnswer(answer, 'fill-in-the-blank');
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
      document.querySelectorAll('.option-btn').forEach(btn => {
        if (btn.textContent === correctAnswer) {
          btn.classList.add('correct');
        } else if (btn.classList.contains('selected')) {
          btn.classList.add('incorrect');
        }
      });
    }
  }
  
  elements.feedbackContainer.appendChild(feedbackDiv);
  
  // Show example sentences
  elements.sentenceExample.classList.remove('hidden');
  elements.latinSentence.textContent = latinSentence;
  elements.englishSentence.textContent = englishSentence;
}

// Show error message
function showError(message) {
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
  // Reset app state
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
    const response = await fetch(`/api/users/${username}/progress`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch user progress');
    }
    
    const progressData = await response.json();
    console.log('User progress:', progressData);
    
    // Update progress stats
    updateProgressStats(progressData);
  } catch (error) {
    console.error('Error fetching user progress:', error);
  }
}

function updateProgressStats(progressData) {
  const { vocabProgress } = progressData;
  
  // Count mastered words (at least 3 correct and 75% accuracy)
  let masteredCount = 0;
  let learningCount = 0;
  
  Object.values(vocabProgress).forEach(progress => {
    const { correctCount, incorrectCount } = progress;
    const total = correctCount + incorrectCount;
    const accuracy = total > 0 ? correctCount / total : 0;
    
    if (correctCount >= 3 && accuracy >= 0.75) {
      masteredCount++;
    } else if (total > 0) {
      learningCount++;
    }
  });
  
  // Update UI
  elements.masteredCountSpan.textContent = masteredCount;
  elements.learningCountSpan.textContent = learningCount;
}

// Practice Functions
function startPractice(mode) {
  if (!appState.currentUser) {
    showError('Please log in first.');
    return;
  }
  
  if (mode === 'chapter' && !appState.selectedChapter) {
    showError('Please select a chapter first.');
    return;
  }
  
  // Set practice mode
  appState.practiceMode = mode;
  
  // Display mode in UI
  const modeDisplay = mode === 'chapter' 
    ? `Chapter ${appState.selectedChapter}` 
    : 'Weak Words';
  
  console.log(`Starting practice in ${modeDisplay} mode`);
  
  // Fetch first question
  fetchNextQuestion();
}