import { MD3LightTheme, MD3DarkTheme } from "react-native-paper";

// Brand / semantic colors that are not part of the MD3 palette
// These colors are constants used throughout the app
export const appColors = {
  // Shown on the saved-bookmark icon when a post is saved
  savedBookmark: "rgb(168, 96, 146)",
  // Unread-message badge background
  unreadBadge: "#EF4444",
  unreadBadgeText: "#FFFFFF",
  // Semi-transparent overlay used on post card image (price bar)
  imageOverlay: "rgba(0,0,0,0.5)",
  imageOverlayText: "#FFFFFF",
  // Placeholder background for images while loading
  imagePlaceholder: "#f0f0f0",
};

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    background: "#F5F5F5",
    surface: "#FFFFFF",
    elevation: {
      ...MD3LightTheme.colors.elevation,
      level0: "#F5F5F5",
    },
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    background: "#1A1A1A",
    surface: "#242424",
    elevation: {
      ...MD3DarkTheme.colors.elevation,
      level0: "#1A1A1A",
      level1: "#242424",
      level2: "#2A2A2A",
      level3: "#303030",
    },
  },
};

// Helper function to get the theme based on isDarkMode
export const getTheme = (isDarkMode: boolean) => {
  return isDarkMode ? darkTheme : lightTheme;
};
