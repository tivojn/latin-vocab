# Latin Vocabulary Learning App

A web application for learning Latin vocabulary from the Cambridge Latin Course, featuring interactive practice modes, progress tracking, and adaptive learning.

## Features

- Multiple choice and fill-in-the-blank question formats
- Progress tracking for vocabulary mastery
- Support for Cambridge Latin Course Books 1 and 2
- Weak words practice mode based on user performance
- Mobile-responsive design with Tailwind CSS

## Tech Stack

- **Backend**: Node.js with Express
- **Frontend**: HTML, CSS, JavaScript
- **UI Framework**: Tailwind CSS
- **Styling**: ShadCN UI components

## Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`
4. Visit http://localhost:3000 in your browser

## Deployment

### Vercel

This project is configured for easy deployment to Vercel:

1. Push to GitHub
2. Connect your GitHub repository to Vercel
3. Vercel will automatically deploy using the configuration in `vercel.json`

### Manual Deployment

For manual deployment:

1. Build the project: `npm run build`
2. Start the server: `npm start`

## Project Structure

- `/public` - Static assets and frontend code
- `/server.js` - Express server and API endpoints
- `/vocabulary.json` - Vocabulary data for Book 1
- `/vocabulary-bk2.json` - Vocabulary data for Book 2
- `/users.json` - User progress data

## License

ISC
