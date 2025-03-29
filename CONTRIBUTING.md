# Contributing to Latin Vocabulary Learning App

Thank you for considering contributing to the Latin Vocabulary Learning App! This document provides guidelines and instructions for contributing to the project.

## Setting Up Development Environment

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/Latin-Vocab-Shadcn.git`
3. Navigate to the project directory: `cd Latin-Vocab-Shadcn`
4. Install dependencies: `npm install`
5. Create a `.env` file based on `.env.example`
6. Start the development server: `npm run dev`

## Development Workflow

1. Create a new branch for your feature or bugfix: `git checkout -b feature/your-feature-name`
2. Make your changes
3. Test your changes thoroughly
4. Commit your changes with descriptive commit messages
5. Push your branch to your fork: `git push origin feature/your-feature-name`
6. Open a pull request against the main repository

## Code Style Guidelines

- Use clear, descriptive variable and function names
- Comment complex code sections
- Follow the existing project structure
- Use meaningful commit messages

## Adding New Features

When adding new features:

1. Update relevant documentation
2. Add tests if applicable
3. Ensure your changes do not break existing functionality
4. Update the config.js file if adding configurable parameters

## Adding Vocabulary Data

To add more vocabulary to the app:

1. Follow the JSON structure in the existing vocabulary files
2. Each word entry should include:
   - `latin`: Latin word
   - `english`: English translation
   - `latinSentence`: Example sentence in Latin
   - `englishSentence`: Example sentence in English

## Reporting Issues

When reporting issues, please include:

- A clear description of the problem
- Steps to reproduce
- Expected vs. actual behavior
- Any error messages or screenshots
- Browser and device information (if relevant)

## Pull Request Process

1. Update the README.md with details of significant changes if needed
2. Make sure your code runs without errors
3. Update documentation as needed
4. Your PR will be reviewed and merged if appropriate

## License

By contributing, you agree that your contributions will be licensed under the project's ISC license.
