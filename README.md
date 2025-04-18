# TRALA Social Media App

A simple social media application with posting, direct messaging, and cancellation features.

## Features

- User registration and login
- Create and view posts with images/GIFs
- Like and dislike posts
- Create polls with multiple options
- Comment on posts
- Direct messaging between users
- SMS notifications using Twilio
- @mentions in posts and comments
- User cancellation system
- Profile picture management

## SMS Notification Setup

The app includes SMS notifications via Twilio when new posts are made. To enable this:

1. Copy the `.env.example` file and rename it to `.env.local`
2. Update the environment variables with your Twilio credentials:
   ```
   REACT_APP_TWILIO_ACCOUNT_SID=your_account_sid_here
   REACT_APP_TWILIO_AUTH_TOKEN=your_auth_token_here
   REACT_APP_TWILIO_PHONE_NUMBER=your_twilio_phone_number_here
   ```
3. Restart the development server

Users can opt in to SMS notifications by adding their phone number in their profile settings.

## Local Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables as described above
4. Start the development server: `npm start`

## Production Deployment

For production deployment (such as on Vercel):

1. Set the environment variables in your hosting platform's settings
2. Deploy the application

## Security Note

For production use, SMS notifications should be handled by a backend server or serverless function to avoid exposing API credentials in client-side code. The current implementation is designed for learning purposes only.

## License

[MIT](LICENSE)
