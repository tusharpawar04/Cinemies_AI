export const MOOD_CONFIG = {
  mind_bending: {
    label: "Mind Bending",
    icon: "🌀",
    description: "Reality distorted",
    colors: {
      primary: "#a78bfa",
      secondary: "#7c3aed",
      accent: "#c4b5fd",
      glow: "rgba(167,139,250,0.15)",
      fog: 0x110820,
    },
    particleOpacity: 0.65,
    fogDensity: 0.018,
    atmosphereClip: {
      youtubeId: "YoHD9XEInc0",
      startAt: 30,
      creditTitle: "Inception (2010)",
      creditStudio: "Warner Bros. Pictures",
    },
    featuredMovies: ["Inception", "Andhadhun", "Kaala", "Tenet", "Memento"]
  },
  comfort_food: {
    label: "Comfort Food",
    icon: "☕",
    description: "Warm & cozy",
    colors: {
      primary: "#f59e0b",
      secondary: "#d97706",
      accent: "#fcd34d",
      glow: "rgba(245,158,11,0.12)",
      fog: 0x1a1002,
    },
    particleOpacity: 0.5,
    fogDensity: 0.012,
    atmosphereClip: {
      youtubeId: "xvszmNXdM4w",
      startAt: 15,
      creditTitle: "3 Idiots (2009)",
      creditStudio: "Vinod Chopra Films",
    },
    featuredMovies: ["3 Idiots", "Dil Chahta Hai", "Hera Pheri", "Chef", "RRR"]
  },
  edge_of_seat: {
    label: "Edge of Seat",
    icon: "⚡",
    description: "Heart pounding",
    colors: {
      primary: "#ef4444",
      secondary: "#dc2626",
      accent: "#fca5a5",
      glow: "rgba(239,68,68,0.15)",
      fog: 0x150202,
    },
    particleOpacity: 0.55,
    fogDensity: 0.022,
    atmosphereClip: {
      youtubeId: "A_iCoKCKi9A",
      startAt: 25,
      creditTitle: "Drishyam (2013)",
      creditStudio: "Aashirvad Cinemas",
    },
    featuredMovies: ["Drishyam", "Mad Max: Fury Road", "Lagaan", "Gravity", "Nayakan"]
  },
  visual_spectacle: {
    label: "Visual Spectacle",
    icon: "✨",
    description: "Pure sensation",
    colors: {
      primary: "#06b6d4",
      secondary: "#0891b2",
      accent: "#67e8f9",
      glow: "rgba(6,182,212,0.15)",
      fog: 0x021015,
    },
    particleOpacity: 0.7,
    fogDensity: 0.014,
    atmosphereClip: {
      youtubeId: "G2uzsIULBn0",
      startAt: 10,
      creditTitle: "Bahubali 2: The Conclusion (2017)",
      creditStudio: "Arka Media Works",
    },
    featuredMovies: ["Bahubali 2", "Avatar", "Interstellar", "Life of Pi", "2001: A Space Odyssey"]
  },
  heartwarming: {
    label: "Heartwarming",
    icon: "💛",
    description: "Tears & smiles",
    colors: {
      primary: "#ec4899",
      secondary: "#db2777",
      accent: "#f9a8d4",
      glow: "rgba(236,72,153,0.15)",
      fog: 0x150210,
    },
    particleOpacity: 0.55,
    fogDensity: 0.01,
    atmosphereClip: {
      youtubeId: "I7nWxJGPJkk",
      startAt: 20,
      creditTitle: "Taare Zameen Par (2007)",
      creditStudio: "Aamir Khan Productions",
    },
    featuredMovies: ["Taare Zameen Par", "Coco", "Bommarillu", "3 Idiots", "Soul"]
  },
  dark_mirror: {
    label: "Dark Mirror",
    icon: "🪞",
    description: "Unsettling truth",
    colors: {
      primary: "#64748b",
      secondary: "#475569",
      accent: "#94a3b8",
      glow: "rgba(100,116,139,0.1)",
      fog: 0x050506,
    },
    particleOpacity: 0.28,
    fogDensity: 0.028,
    atmosphereClip: {
      youtubeId: "5xH0HfJHsaY",
      startAt: 30,
      creditTitle: "Parasite (2019)",
      creditStudio: "CJ ENM / Barunson E&A",
    },
    featuredMovies: ["Parasite", "Article 15", "Gone Girl", "Raat Akeli Hai", "Khaidi No. 150"]
  }
}

export const MOOD_KEYS = Object.keys(MOOD_CONFIG)
