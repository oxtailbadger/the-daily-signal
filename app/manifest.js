export default function manifest() {
  return {
    name: "The Daily Signal",
    short_name: "Daily Signal",
    description: "A quiet place to read the news.",
    start_url: "/",
    display: "standalone",
    background_color: "#F1EEE6",
    theme_color: "#F1EEE6",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
