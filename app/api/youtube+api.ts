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

    try {
      // Enhanced YouTube API call with better error handling
      const apiKey = 'AIzaSyBJ0Tu-2JFectz7e7ieMEJ7Pl8Yh0o8Kg8';
      const apiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet,contentDetails,status`;
      
      console.log('Making YouTube API request...');
      
      const response = await fetch(apiUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'VidGro-App/1.0',
        },
        // Add timeout
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });
      
      if (!response.ok) {
        console.warn('YouTube API request failed:', response.status, response.statusText);
        throw new Error(`YouTube API request failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('YouTube API response received');
      
      if (!data.items || data.items.length === 0) {
        return Response.json({ 
          message: 'Video not found, private, or deleted',
          valid: false 
        }, { status: 404 });
      }

      const video = data.items[0];
      const snippet = video.snippet || {};
      const contentDetails = video.contentDetails || {};
      const status = video.status || {};
      
      const title = snippet.title || `Video ${videoId}`;
      const duration = parseDuration(contentDetails.duration || 'PT0S');
      
      // Enhanced validation checks
      const isEmbeddable = status.embeddable !== false;
      const isPublic = status.privacyStatus === 'public';
      const isListed = status.privacyStatus !== 'private';
      const uploadStatus = status.uploadStatus;
      
      console.log('Video validation:', {
        title,
        duration,
        embeddable: isEmbeddable,
        public: isPublic,
        listed: isListed,
        uploadStatus,
        privacyStatus: status.privacyStatus
      });

      let warning = null;
      
      // Check for embedding restrictions
      if (!isEmbeddable) {
        return Response.json({ 
          message: 'This video cannot be embedded or played in external players',
          valid: false 
        }, { status: 400 });
      }

      // Check for privacy restrictions
      if (!isListed) {
        return Response.json({ 
          message: 'This video is private or unlisted and cannot be accessed',
          valid: false 
        }, { status: 400 });
      }

      // Check upload status
      if (uploadStatus && uploadStatus !== 'processed') {
        return Response.json({ 
          message: 'Video is still processing or has upload issues',
          valid: false 
        }, { status: 400 });
      }

      // Add warnings for potential issues
      if (!isPublic) {
        warning = 'Video may have restricted access';
      }

      if (duration === 0) {
        warning = 'Could not determine video duration - may be a live stream';
      }

      if (duration > 3600) { // More than 1 hour
        warning = 'Video is very long - consider setting a shorter duration';
      }

      // Check for age restrictions
      if (contentDetails.contentRating && Object.keys(contentDetails.contentRating).length > 0) {
        warning = 'Video may have age restrictions';
      }

      return Response.json({
        id: videoId,
        title: title,
        duration: duration,
        thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        valid: true,
        warning: warning,
        metadata: {
          embeddable: isEmbeddable,
          public: isPublic,
          uploadStatus: uploadStatus,
          privacyStatus: status.privacyStatus
        }
      });

    } catch (apiError: any) {
      console.error('YouTube API error:', apiError);
      
      // Enhanced fallback with better error handling
      if (apiError.name === 'AbortError') {
        return Response.json({
          message: 'Request timeout - please try again',
          valid: false
        }, { status: 408 });
      }

      // Check if it's a quota exceeded error
      if (apiError.message && apiError.message.includes('quota')) {
        return Response.json({
          message: 'YouTube API quota exceeded - please try again later',
          valid: false
        }, { status: 429 });
      }

      // Provide fallback data but mark as unverified
      return Response.json({
        id: videoId,
        title: `Video ${videoId.substring(0, 8)}`,
        duration: 120, // Default 2 minutes
        thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        valid: true,
        warning: 'Could not validate video details with YouTube API. Video may not play correctly or may have restrictions.',
        metadata: {
          embeddable: null,
          public: null,
          uploadStatus: 'unknown',
          privacyStatus: 'unknown'
        }
      });
    }

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
  // Enhanced video ID extraction with more patterns
  const patterns = [
    // Standard watch URLs
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/,
    // Shorts URLs
    /youtube\.com\/shorts\/([^"&?\/\s]{11})/,
    // Mobile URLs
    /m\.youtube\.com\/watch\?v=([^"&?\/\s]{11})/,
    // Gaming URLs
    /gaming\.youtube\.com\/watch\?v=([^"&?\/\s]{11})/,
    // Direct video ID
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

function parseDuration(duration: string): number {
  // Enhanced ISO 8601 duration parsing
  if (!duration || duration === 'PT0S') return 0;
  
  try {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    
    if (!match) return 0;
    
    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseInt(match[3] || '0', 10);
    
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    
    // Validate reasonable duration (not more than 24 hours)
    if (totalSeconds > 86400) {
      console.warn('Video duration seems unusually long:', totalSeconds);
      return 0;
    }
    
    return totalSeconds;
  } catch (error) {
    console.error('Error parsing duration:', error);
    return 0;
  }
}