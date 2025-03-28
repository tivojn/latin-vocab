# Latin Vocabulary Learning App

A Latin vocabulary learning app designed to work with Vercel deployment. This app helps students learn Latin vocabulary through interactive exercises.

## Features

- Multiple choice and fill-in-the-blank practice
- Progress tracking system
- Separate view for mastered, learning, and weak words
- Support for multiple books (Cambridge Latin Course Book 1 and 2)
- Multiple practice modes (chapter-based, weak words)

## Project Structure

- `/api` - Serverless API functions for Vercel
- `/public` - Static frontend files
- `vercel.json` - Vercel configuration
- `vocabulary-bk1.json` and `vocabulary-bk2.json` - Vocabulary data files
- `users.json` - User data storage

## Deployment Instructions

### Deploy to Vercel

1. Fork or clone this repository to your GitHub account
2. Connect your GitHub repository to Vercel
3. Deploy the project with default settings
4. The app will be available at your Vercel deployment URL

### Local Development

1. Clone the repository
2. Install dependencies:
```
npm install
```
3. Run development server:
```
npm run dev
```
4. Open http://localhost:3000 in your browser

## How It Works

This project uses a serverless architecture that works with Vercel's deployment model:

1. Static files (HTML, CSS, JS) are served from the `/public` directory
2. API endpoints are implemented as serverless functions in the `/api` directory
3. Data is stored in JSON files (vocabulary and user data)
4. The `vercel.json` file configures routing

## Troubleshooting

If you encounter issues with the Vercel deployment:

1. Check the Vercel deployment logs
2. Make sure all files (including vocabulary and users.json) are properly uploaded
3. Check that the API routes are properly configured in vercel.json
4. Verify that all API endpoints are working correctly
5. Check for any environment variables that might be missing
6. Ensure the serverless function timeout is sufficient for your needs

## Key Differences from Express Version

This version differs from the Express.js version in several important ways:

1. **Serverless Architecture**: Each API endpoint is a separate serverless function instead of Express routes
2. **Global State Management**: State that was previously managed in server memory is now stored in the JSON files
3. **File Paths**: File paths are adjusted to work with Vercel's serverless environment
4. **Routing**: Routes are configured using the vercel.json file instead of Express routing

## License

MIT License
