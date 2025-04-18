// Twilio service for sending SMS notifications
import { getUsers } from './firebase';

// Hardcoded credentials for this test application

// The toll-free number needs to be verified by Twilio for SMS
// Since this is a demo app, we'll simulate SMS instead

/**
 * Send SMS notifications to all users who have opted in
 */
export const sendNotificationToSubscribers = async (postAuthor: string): Promise<void> => {
  try {
    // Get all users who have opted in to notifications
    let subscribedUsers: string[] = [];
    
    await new Promise<void>((resolve) => {
      getUsers((users) => {
        subscribedUsers = users
          .filter(user => 
            user.receiveNotifications && 
            user.phoneNumber && 
            user.username !== postAuthor
          )
          .map(user => user.phoneNumber!) as string[];
        resolve();
      });
    });
    
    if (subscribedUsers.length === 0) {
      console.log('No subscribed users to notify');
      return;
    }
    
    // For each subscribed user, log the notification (simulated send)
    const appUrl = 'https://trala-pork2.vercel.app/';
    const message = `SOMETHING VERY HAPPENED ON TRALA CHECK IT OUT!!! -> ${appUrl}`;
    
    for (const phoneNumber of subscribedUsers) {
      // In a demo app, we'll just log this instead of actually sending
      console.log(`[SIMULATED SMS] To: ${phoneNumber}, Message: ${message}`);
    }
    
    // Log to the console for demo purposes
    console.log(`[DEMO MODE] Notifications would be sent to ${subscribedUsers.length} users if toll-free number was verified.`);
    
  } catch (error) {
    console.error('Error processing notifications:', error);
  }
};

// Helper function that would be replaced with actual Twilio API call if using a verified number
const sendActualSms = async (to: string, body: string): Promise<boolean> => {
  // Just log the SMS details since we can't actually send
  console.log(`[SIMULATED SMS] To: ${to}, Message: ${body}`);
  return true;
}; 