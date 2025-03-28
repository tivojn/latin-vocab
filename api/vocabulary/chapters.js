const { readJsonFile, VOCABULARY_FILES, DEFAULT_BOOK } = require('../utils');

module.exports = (req, res) => {
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
    res.status(200).json(vocabularyData.chapters);
  } catch (error) {
    console.error('Error in /api/vocabulary/chapters:', error);
    return res.status(500).json({ error: error.message });
  }
};
