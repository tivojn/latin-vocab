const { readJsonFile, VOCABULARY_FILES } = require('../utils');

module.exports = (req, res) => {
  console.log('GET /api/vocabulary/books requested');
  try {
    // Return list of available books
    const books = [
      { id: 'bk1', title: 'Cambridge Latin Course Book 1' },
      { id: 'bk2', title: 'Cambridge Latin Course Book 2' }
    ];
    
    res.status(200).json(books);
  } catch (error) {
    console.error('Error in /api/vocabulary/books:', error);
    return res.status(500).json({ error: error.message });
  }
};
