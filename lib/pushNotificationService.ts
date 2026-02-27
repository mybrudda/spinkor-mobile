import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { supabase } from '../supabaseClient';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Storage key
const PUSH_TOKEN_KEY = 'expo_push_token';

export class PushNotificationService {
  private static instance: PushNotificationService;
  private expoPushToken: string | null = null;
  private isInitialized: boolean = false;

  private constructor() {}

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  /**
   * Initialize push notification service
   * This should be called once when the app starts
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Set up notification listeners
      this.setupNotificationListeners();
      
      // Load existing token from storage
      const storedToken = await this.getStoredToken();
      if (storedToken) {
        this.expoPushToken = storedToken;
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('Error initializing push notification service:', error);
    }
  }

  /**
   * Get stored push token
   */
  private async getStoredToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    } catch (error) {
      console.error('Error getting stored token:', error);
      return null;
    }
  }

  /**
   * Store push token locally
   */
  private async storeToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
    } catch (error) {
      console.error('Error storing token:', error);
    }
  }

  /**
   * Save token to database
   */
  private async saveTokenToDatabase(token: string): Promise<boolean> {
    try {
      const deviceId = Device.osInternalBuildId || Device.deviceName || Device.modelName || 'unknown';
      
      const { error } = await supabase.rpc('register_expo_push_token', {
        p_expo_push_token: token,
        p_device_id: deviceId,
      });

      if (error) {
        console.error('Error saving token to database:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error saving token:', error);
      return false;
    }
  }

  /**
   * Register for push notifications
   * Follows the flow: check AsyncStorage -> if no token and user logged in -> register -> save
   */
  async registerForPushNotifications(): Promise<string | null> {
    try {
      // Check if we already have a stored token
      const storedToken = await this.getStoredToken();
      if (storedToken) {
        this.expoPushToken = storedToken;
        return this.expoPushToken;
      }

      // Check if device supports push notifications
      if (!Device.isDevice) {
        return null;
      }

      // Set up Android notification channel
      if (Platform.OS === 'android') {
        Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound: 'notification.mp3',
        });
      }

      // Check and request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        return null;
      }

      // Get project ID
      const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
      if (!projectId) {
        console.error('Project ID not found');
        return null;
      }

      // Get push token
      const { data: token } = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      this.expoPushToken = token;

      // Store token locally
      await this.storeToken(this.expoPushToken);

      // Save to database
      await this.saveTokenToDatabase(this.expoPushToken);

      return this.expoPushToken;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  /**
   * Set up notification listeners
   */
  setupNotificationListeners(): void {
    // Handle notifications received while app is in foreground
    Notifications.addNotificationReceivedListener(_notification => {});

    // Handle notification responses (when user taps on notification)
    Notifications.addNotificationResponseReceivedListener(response => {
      this.handleNotificationResponse(response);
    });
  }

  /**
   * Handle notification response
   */
  private handleNotificationResponse(response: Notifications.NotificationResponse): void {
    const data = response.notification.request.content.data;
    
    switch (data.type) {
      case 'message':
        // TODO (C-5): navigate to ChatRoom with data.conversationId
        break;
      case 'post':
        // TODO (C-5): navigate to PostDetails with data.postId
        break;
    }
  }

  /**
   * Send push notification
   */
  async sendPushNotification(
    recipientUserId: string,
    title: string,
    body: string,
    data: Record<string, any> = {}
  ): Promise<boolean> {
    try {
      // Check if we should send notification
      const { data: shouldSend, error: checkError } = await supabase.rpc('should_send_notification', {
        p_recipient_id: recipientUserId,
        p_sender_id: data.senderId || 'system',
        p_notification_type: data.type || 'message',
        p_conversation_id: data.conversationId || null
      });

      if (checkError || !shouldSend) {
        return false;
      }

      // Get recipient's push tokens
      const { data: tokens, error: tokensError } = await supabase.rpc('get_user_expo_push_tokens', {
        p_user_id: recipientUserId
      });

      if (tokensError || !tokens || tokens.length === 0) {
        return false;
      }

      // Prepare messages
      const messages = tokens.map((token: { expo_push_token: string }) => ({
        to: token.expo_push_token,
        sound: 'notification.mp3',
        title,
        body,
        data: {
          ...data,
          timestamp: new Date().toISOString(),
        },
      }));

      // Send notifications
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      const result = await response.json();
      
      if (response.ok) {
        return true;
      } else {
        console.error('Failed to send push notification:', result);
        return false;
      }
    } catch (error) {
      console.error('Error sending push notification:', error);
      return false;
    }
  }

  /**
   * Send message notification
   */
  async sendMessageNotification(
    recipientUserId: string,
    senderName: string,
    message: string,
    senderId: string,
    conversationId: string
  ): Promise<boolean> {
    return this.sendPushNotification(
      recipientUserId,
      `${senderName} sent you a message`,
      message.length > 50 ? `${message.substring(0, 50)}...` : message,
      {
        type: 'message',
        senderId,
        conversationId,
        senderName,
      }
    );
  }

  /**
   * Get current push token
   */
  getExpoPushToken(): string | null {
    return this.expoPushToken;
  }

  /**
   * Check if a push token exists (either in memory or storage)
   */
  async hasToken(): Promise<boolean> {
    if (this.expoPushToken) {
      return true;
    }
    
    const storedToken = await this.getStoredToken();
    return storedToken !== null;
  }

  /**
   * Clear stored token (for logout)
   */
  async clearToken(): Promise<void> {
    try {
      this.expoPushToken = null;
      await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
    } catch (error) {
      console.error('Error clearing push token:', error);
    }
  }
}

// Export singleton instance
export const pushNotificationService = PushNotificationService.getInstance();