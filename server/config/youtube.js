const axios = require('axios');

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || 'AIzaSyBJ0Tu-2JFectz7e7ieMEJ7Pl8Yh0o8Kg8';
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

class YouTubeService {
    // Extract video ID from YouTube URL
    extractVideoId(url) {
        const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
        const match = url.match(regex);
        return match ? match[1] : null;
    }

    // Validate YouTube video URL
    async validateVideoUrl(url) {
        const videoId = this.extractVideoId(url);
        if (!videoId) {
            throw new Error('Invalid YouTube URL format');
        }

        try {
            const response = await axios.get(`${YOUTUBE_API_BASE}/videos`, {
                params: {
                    key: YOUTUBE_API_KEY,
                    id: videoId,
                    part: 'snippet,contentDetails,status'
                },
                timeout: 10000
            });

            if (response.data.items.length === 0) {
                throw new Error('Video not found or is private');
            }

            const video = response.data.items[0];
            
            // Check if video is available
            if (video.status.privacyStatus !== 'public') {
                throw new Error('Video must be public to be promoted');
            }

            // Check if embeddable
            if (video.status.embeddable === false) {
                throw new Error('Video is not embeddable');
            }

            const duration = this.parseDuration(video.contentDetails.duration);
            
            // Validate duration (10 seconds to 5 minutes)
            if (duration < 10) {
                throw new Error('Video must be at least 10 seconds long');
            }
            if (duration > 300) {
                throw new Error('Video must be no longer than 5 minutes');
            }

            return {
                videoId,
                title: video.snippet.title,
                duration,
                thumbnail: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.default.url,
                channelTitle: video.snippet.channelTitle,
                publishedAt: video.snippet.publishedAt,
                description: video.snippet.description
            };
        } catch (error) {
            if (error.response) {
                if (error.response.status === 403) {
                    throw new Error('YouTube API quota exceeded or invalid API key');
                }
                if (error.response.status === 400) {
                    throw new Error('Invalid video ID or API request');
                }
            }
            
            if (error.code === 'ECONNABORTED') {
                throw new Error('YouTube API request timeout');
            }
            
            throw error;
        }
    }

    // Parse ISO 8601 duration to seconds
    parseDuration(duration) {
        const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
        if (!match) return 0;
        
        const hours = parseInt(match[1]) || 0;
        const minutes = parseInt(match[2]) || 0;
        const seconds = parseInt(match[3]) || 0;
        
        return hours * 3600 + minutes * 60 + seconds;
    }

    // Generate embed URL
    getEmbedUrl(videoId, autoplay = false) {
        const params = new URLSearchParams({
            rel: '0',
            modestbranding: '1',
            controls: '1',
            showinfo: '0'
        });
        
        if (autoplay) {
            params.set('autoplay', '1');
        }
        
        return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
    }

    // Get video thumbnail
    getThumbnailUrl(videoId, quality = 'hqdefault') {
        return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
    }

    // Get video watch URL
    getWatchUrl(videoId) {
        return `https://www.youtube.com/watch?v=${videoId}`;
    }
}

module.exports = new YouTubeService();