export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const videoUrl = url.searchParams.get('url');
    
    if (!videoUrl) {
      return Response.json({ 
        message: 'Video URL is required',
        valid: false 
      }, { status: 400 });
    }

    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
      return Response.json({ 
        message: 'Invalid YouTube URL format',
        valid: false 
      }, { status: 400 });
    }

    console.log('Processing YouTube video ID:', videoId);

    // Return video ID and embed URL without API validation
    return Response.json({
      id: videoId,
      embedUrl: `https://www.youtube.com/embed/${videoId}`,
      thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      valid: true,
      embeddable: null, // Will be determined by iframe test
      originalUrl: videoUrl,
      message: 'Video ID extracted successfully. Test embedability with iframe.'
    });

  } catch (error: any) {
    console.error('Error in YouTube API route:', error);
    
    return Response.json({ 
      message: 'Failed to process video URL. Please check the URL format and try again.',
      valid: false,
      error: error.message
    }, { status: 500 });
  }
}

function extractVideoId(url: string): string | null {
  // Enhanced video ID extraction with comprehensive patterns
  const patterns = [
    // Standard watch URLs: https://www.youtube.com/watch?v=VIDEO_ID
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=))([^"&?\/\s]{11})/,
    // Short URLs: https://youtu.be/VIDEO_ID
    /(?:youtu\.be\/)([^"&?\/\s]{11})/,
    // Shorts URLs: https://www.youtube.com/shorts/VIDEO_ID
    /youtube\.com\/shorts\/([^"&?\/\s]{11})/,
    // Mobile URLs: https://m.youtube.com/watch?v=VIDEO_ID
    /m\.youtube\.com\/watch\?v=([^"&?\/\s]{11})/,
    // Gaming URLs: https://gaming.youtube.com/watch?v=VIDEO_ID
    /gaming\.youtube\.com\/watch\?v=([^"&?\/\s]{11})/,
    // Embed URLs: https://www.youtube.com/embed/VIDEO_ID
    /youtube\.com\/embed\/([^"&?\/\s]{11})/,
    // Direct video ID: VIDEO_ID (11 characters)
    /^([a-zA-Z0-9_-]{11})$/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      // Validate video ID format
      const videoId = match[1];
      if (/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        return videoId;
      }
    }
  }

  return null;
}