/**
 * Application Configuration
 * This file centralizes all configuration parameters for the application
 */

require('dotenv').config();

module.exports = {
  // Server configuration
  server: {
    port: process.env.PORT || 3000,
    environment: process.env.NODE_ENV || 'development'
  },
  
  // File paths for data
  data: {
    vocabularyFiles: {
      bk1: './vocabulary.json',
      bk2: './vocabulary-bk2.json'
    },
    usersFile: './users.json',
    defaultBook: 'bk1'
  },
  
  // Settings for learning algorithm
  learningAlgorithm: {
    // Number of correct answers needed to consider a word mastered
    masterThreshold: 3,
    
    // Minimum accuracy needed to consider a word mastered (0.75 = 75%)
    masterAccuracyThreshold: 0.75,
    
    // Error rate threshold to consider a word "weak" (0.3 = 30%)
    weakWordThreshold: 0.3,
    
    // Maximum number of recent words to avoid repetition
    recentWordsMaxCount: 10
  }
};
