const { readJsonFile, VOCABULARY_FILES, DEFAULT_BOOK } = require('../../utils');

module.exports = (req, res) => {
  const { chapterNumber } = req.query;
  const chapterNum = parseInt(chapterNumber, 10);
  const book = req.query.book || DEFAULT_BOOK;
  const vocabularyFile = VOCABULARY_FILES[book] || VOCABULARY_FILES[DEFAULT_BOOK];
  
  try {
    const vocabularyData = readJsonFile(vocabularyFile);
    
    if (!vocabularyData) {
      return res.status(500).json({ error: 'Failed to read vocabulary data' });
    }
    
    const chapter = vocabularyData.chapters.find(c => c.chapterNumber === chapterNum);
    
    if (!chapter) {
      return res.status(404).json({ error: 'Chapter not found' });
    }
    
    res.status(200).json(chapter);
  } catch (error) {
    console.error(`Error in /api/vocabulary/chapters/${chapterNumber}:`, error);
    return res.status(500).json({ error: error.message });
  }
};
