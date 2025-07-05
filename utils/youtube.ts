export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/,
    /^([a-zA-Z0-9_-]{11})$/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

export function getYouTubeThumbnail(videoId: string, quality: 'default' | 'medium' | 'high' | 'maxres' = 'maxres'): string {
  return `https://img.youtube.com/vi/${videoId}/${quality}default.jpg`;
}

export function getYouTubeEmbedUrl(videoId: string, options: {
  autoplay?: boolean;
  controls?: boolean;
  modestbranding?: boolean;
  showinfo?: boolean;
  rel?: boolean;
  fs?: boolean;
} = {}): string {
  const {
    autoplay = false,
    controls = false,
    modestbranding = true,
    showinfo = false,
    rel = false,
    fs = false
  } = options;

  const params = new URLSearchParams({
    autoplay: autoplay ? '1' : '0',
    controls: controls ? '1' : '0',
    modestbranding: modestbranding ? '1' : '0',
    showinfo: showinfo ? '1' : '0',
    rel: rel ? '1' : '0',
    fs: fs ? '1' : '0',
    disablekb: '1'
  });

  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

export function validateYouTubeUrl(url: string): boolean {
  return extractVideoId(url) !== null;
}

export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}