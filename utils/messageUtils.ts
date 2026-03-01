import { Message } from '../types/chat';
import { format, isToday, isYesterday, isSameDay, isSameMinute } from 'date-fns';

export interface GroupedMessage {
  id: string;
  type: 'message' | 'date-separator';
  data: Message | { date: string };
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
}

export const groupMessages = (messages: Message[]): GroupedMessage[] => {
  if (messages.length === 0) return [];

  const grouped: GroupedMessage[] = [];
  let currentDate: string | null = null;

  messages.forEach((message, index) => {
    const messageDate = new Date(message.created_at);
    const messageDateStr = format(messageDate, 'yyyy-MM-dd');

    // Add date separator if it's a new date
    if (currentDate !== messageDateStr) {
      grouped.push({
        id: `date-${messageDateStr}`,
        type: 'date-separator',
        data: { date: messageDateStr },
      });
      currentDate = messageDateStr;
    }

    // Check if this message is first/last in a group
    const prevMessage = index > 0 ? messages[index - 1] : null;
    const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;

    const isFirstInGroup =
      !prevMessage ||
      message.sender_id !== prevMessage.sender_id ||
      !isSameMinute(messageDate, new Date(prevMessage.created_at));

    const isLastInGroup =
      !nextMessage ||
      message.sender_id !== nextMessage.sender_id ||
      !isSameMinute(messageDate, new Date(nextMessage.created_at));

    // Add the message
    grouped.push({
      id: message.id,
      type: 'message',
      data: message,
      isFirstInGroup,
      isLastInGroup,
    });
  });

  return grouped;
};

export const formatMessageTime = (date: string): string => {
  const messageDate = new Date(date);
  if (isToday(messageDate)) {
    return format(messageDate, 'h:mm a');
  } else if (isYesterday(messageDate)) {
    return `Yesterday, ${format(messageDate, 'h:mm a')}`;
  } else {
    return format(messageDate, 'MMM d, h:mm a');
  }
};

export const formatDateSeparator = (date: string): string => {
  const messageDate = new Date(date);

  if (isToday(messageDate)) {
    return 'Today';
  } else if (isYesterday(messageDate)) {
    return 'Yesterday';
  } else {
    return format(messageDate, 'MMMM d, yyyy');
  }
};

export const shouldShowDateSeparator = (
  currentMessage: Message,
  previousMessage?: Message
): boolean => {
  if (!previousMessage) return true;

  const currentDate = new Date(currentMessage.created_at);
  const previousDate = new Date(previousMessage.created_at);

  return !isSameDay(currentDate, previousDate);
};

export const isFirstInGroup = (currentMessage: Message, previousMessage?: Message): boolean => {
  if (!previousMessage) return true;

  const currentDate = new Date(currentMessage.created_at);
  const previousDate = new Date(previousMessage.created_at);

  return (
    currentMessage.sender_id !== previousMessage.sender_id ||
    !isSameMinute(currentDate, previousDate)
  );
};

export const isLastInGroup = (currentMessage: Message, nextMessage?: Message): boolean => {
  if (!nextMessage) return true;

  const currentDate = new Date(currentMessage.created_at);
  const nextDate = new Date(nextMessage.created_at);

  return currentMessage.sender_id !== nextMessage.sender_id || !isSameMinute(currentDate, nextDate);
};
