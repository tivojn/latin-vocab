// Embedded vocabulary data (this replaces the server API)
const vocabularyData = {
  "chapters": [
    {
      "chapterNumber": 1,
      "chapterTitle": "House and Family",
      "words": [
        {
          "latin": "canis",
          "english": "dog",
          "latinSentence": "Canis in hortō dormit.",
          "englishSentence": "The dog is sleeping in the garden."
        },
        {
          "latin": "coquus",
          "english": "cook",
          "latinSentence": "Coquus cibum parat.",
          "englishSentence": "The cook is preparing the food."
        },
        {
          "latin": "domus",
          "english": "house, home",
          "latinSentence": "Domus nostra magna est.",
          "englishSentence": "Our house is large."
        },
        {
          "latin": "familia",
          "english": "family",
          "latinSentence": "Familia mea in domō habitat.",
          "englishSentence": "My family lives in the house."
        },
        {
          "latin": "pater",
          "english": "father",
          "latinSentence": "Pater meus agricola est.",
          "englishSentence": "My father is a farmer."
        },
        {
          "latin": "mater",
          "english": "mother",
          "latinSentence": "Mater mea cibum parat.",
          "englishSentence": "My mother prepares the food."
        },
        {
          "latin": "filius",
          "english": "son",
          "latinSentence": "Filius meus litterās discit.",
          "englishSentence": "My son learns his letters."
        },
        {
          "latin": "filia",
          "english": "daughter",
          "latinSentence": "Filia mea aquam portat.",
          "englishSentence": "My daughter carries water."
        }
      ]
    },
    {
      "chapterNumber": 2,
      "chapterTitle": "Daily Life and Objects",
      "words": [
        {
          "latin": "mensa",
          "english": "table",
          "latinSentence": "Servus mensam parat.",
          "englishSentence": "The slave is setting the table."
        },
        {
          "latin": "via",
          "english": "road, way",
          "latinSentence": "Via ad urbem ducit.",
          "englishSentence": "The road leads to the city."
        },
        {
          "latin": "liber",
          "english": "book",
          "latinSentence": "Puer librum legit.",
          "englishSentence": "The boy reads the book."
        },
        {
          "latin": "aqua",
          "english": "water",
          "latinSentence": "Servus aquam portat.",
          "englishSentence": "The slave carries water."
        },
        {
          "latin": "cibus",
          "english": "food",
          "latinSentence": "Cibus in mensa est.",
          "englishSentence": "The food is on the table."
        },
        {
          "latin": "lectus",
          "english": "bed",
          "latinSentence": "Puer in lectō dormit.",
          "englishSentence": "The boy sleeps in the bed."
        }
      ]
    },
    {
      "chapterNumber": 3,
      "chapterTitle": "Cities and Places",
      "words": [
        {
          "latin": "urbs",
          "english": "city",
          "latinSentence": "Urbs magna et pulchra est.",
          "englishSentence": "The city is large and beautiful."
        },
        {
          "latin": "forum",
          "english": "forum, marketplace",
          "latinSentence": "Multī hominēs in forō sunt.",
          "englishSentence": "Many people are in the forum."
        },
        {
          "latin": "templum",
          "english": "temple",
          "latinSentence": "Sacerdōs in templō sacrificat.",
          "englishSentence": "The priest sacrifices in the temple."
        },
        {
          "latin": "villa",
          "english": "country house, villa",
          "latinSentence": "Villa in agrīs sita est.",
          "englishSentence": "The villa is situated in the fields."
        },
        {
          "latin": "taberna",
          "english": "shop, tavern",
          "latinSentence": "Mercātor in tabernā labōrat.",
          "englishSentence": "The merchant works in the shop."
        }
      ]
    }
  ]
};

// State management
const appState = {
  selectedChapter: null,
  currentQuestion: null,
  score: {
    correct: 0,
    incorrect: 0
  },
  questionFormat: 'multiple-choice'
};

// DOM Elements
const elements = {
  // Chapter selection
  chaptersList: document.getElementById('chapters-list'),
  
  // Score tracking
  correctCountSpan: document.getElementById('correct-count'),
  incorrectCountSpan: document.getElementById('incorrect-count'),
  
  // Practice options
  practiceChapterBtn: document.getElementById('practice-chapter-btn'),
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
  
  // Practice mode
  elements.practiceChapterBtn.addEventListener('click', () => startPractice());
  
  // Question format toggle
  elements.multipleChoiceBtn.addEventListener('click', () => {
    setQuestionFormat('multiple-choice');
  });
  
  elements.fillInBlankBtn.addEventListener('click', () => {
    setQuestionFormat('fill-in-the-blank');
  });
  
  // Next question button
  elements.nextQuestionBtn.addEventListener('click', generateNextQuestion);
  
  // Load chapters on init
  renderChapters(vocabularyData.chapters);
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

// Render chapters
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
  
  // Select first chapter by default
  const firstChapter = elements.chaptersList.querySelector('.chapter-item');
  if (firstChapter) {
    firstChapter.click();
  }
}

// Generate next question
function generateNextQuestion() {
  // Hide previous feedback
  elements.feedbackContainer.classList.add('hidden');
  elements.sentenceExample.classList.add('hidden');
  
  const chapterNumber = appState.selectedChapter;
  
  if (!chapterNumber) {
    showError('Please select a chapter first.');
    return;
  }
  
  // Find the selected chapter
  const chapter = vocabularyData.chapters.find(c => c.chapterNumber === chapterNumber);
  
  if (!chapter || !chapter.words || chapter.words.length === 0) {
    showError('No words available in this chapter.');
    return;
  }
  
  // Select a random word from the chapter
  const randomWord = chapter.words[Math.floor(Math.random() * chapter.words.length)];
  
  // Determine question format
  const format = appState.questionFormat;
  
  // Determine direction: latin-to-english or english-to-latin
  const direction = Math.random() > 0.5 ? 'latin-to-english' : 'english-to-latin';
  
  let question;
  
  if (format === 'multiple-choice') {
    // Create multiple choice question
    if (direction === 'latin-to-english') {
      // Gather distractors from all chapters
      let distractors = [];
      vocabularyData.chapters.forEach(c => {
        distractors = [...distractors, ...c.words.filter(w => w.latin !== randomWord.latin)];
      });
      
      // Shuffle and get 3 English distractors
      distractors = distractors
        .sort(() => 0.5 - Math.random())
        .slice(0, 3)
        .map(word => word.english);
      
      // Create Latin to English question
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
      // Gather Latin distractors
      let distractors = [];
      vocabularyData.chapters.forEach(c => {
        distractors = [...distractors, ...c.words.filter(w => w.latin !== randomWord.latin)];
      });
      
      // Shuffle and get 3 Latin distractors
      distractors = distractors
        .sort(() => 0.5 - Math.random())
        .slice(0, 3)
        .map(word => word.latin);
      
      // Create English to Latin question
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
    // Create fill-in-the-blank question
    if (direction === 'latin-to-english') {
      // Create a cloze with English translation (blank)
      const fullSentence = randomWord.englishSentence;
      const wordToReplace = randomWord.english;
      
      // Replace the word with a blank
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
  
  // Store current question
  appState.currentQuestion = question;
  
  // Render question
  renderQuestion(question);
}

// Submit answer
function submitAnswer(selectedAnswer, format) {
  if (!appState.currentQuestion) {
    showError('Please start a quiz first.');
    return;
  }
  
  const { correctAnswer, latinWord, latinSentence, englishSentence } = appState.currentQuestion;
  
  // Check if answer is correct
  let isCorrect = false;
  
  if (format === 'fill-in-the-blank') {
    // For fill-in-the-blank, do a more flexible check (case-insensitive and ignore extra spaces)
    const normalizedUserAnswer = selectedAnswer.trim().toLowerCase();
    const normalizedCorrectAnswer = correctAnswer.trim().toLowerCase();
    
    isCorrect = normalizedUserAnswer === normalizedCorrectAnswer;
  } else {
    // For multiple choice, check exact match
    isCorrect = selectedAnswer === correctAnswer;
  }
  
  // Update score
  if (isCorrect) {
    appState.score.correct++;
    elements.correctCountSpan.textContent = appState.score.correct;
  } else {
    appState.score.incorrect++;
    elements.incorrectCountSpan.textContent = appState.score.incorrect;
  }
  
  // Show feedback
  showFeedback({
    correct: isCorrect,
    correctAnswer,
    latinWord,
    latinSentence,
    englishSentence
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

// Start practice
function startPractice() {
  if (!appState.selectedChapter) {
    showError('Please select a chapter first.');
    return;
  }
  
  // Reset score
  appState.score.correct = 0;
  appState.score.incorrect = 0;
  elements.correctCountSpan.textContent = "0";
  elements.incorrectCountSpan.textContent = "0";
  
  // Get first question
  generateNextQuestion();
}