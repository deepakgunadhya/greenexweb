// constants/navigation.ts
export const DEEP_LINK_SCREENS: Record<string, { screen: string; emoji: string; label: string }> = {
  BLOG: {
    screen: "BlogDetail",
    emoji: "📝",
    label: "New Blog Post",
  },
  GRAPHIC: {
    screen: "GraphicDetail",
    emoji: "🎨",
    label: "New Graphic Content",
  },
  VIDEO: {
    screen: "VideoPlayer",
    emoji: "🎥",
    label: "New Video",
  },
};