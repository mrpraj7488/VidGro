const axios = require('axios');

const YOUTUBE_API_KEY = 'AIzaSyBJ0Tu-2JFectz7e7ieMEJ7Pl8Yh0o8Kg8';
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
            throw new Error('Invalid YouTube URL');
        }

        try {
            const response = await axios.get(`${YOUTUBE_API_BASE}/videos`, {
                params: {
                    key: YOUTUBE_API_KEY,
                    id: videoId,
                    part: 'snippet,contentDetails,status'
                }
            });

            if (response.data.items.length === 0) {
                throw new Error('Video not found');
            }

            const video = response.data.items[0];
            
            // Check if video is available
            if (video.status.privacyStatus !== 'public') {
                throw new Error('Video is not public');
            }

            return {
                videoId,
                title: video.snippet.title,
                duration: this.parseDuration(video.contentDetails.duration),
                thumbnail: video.snippet.thumbnails.high.url,
                channelTitle: video.snippet.channelTitle,
                publishedAt: video.snippet.publishedAt
            };
        } catch (error) {
            if (error.response && error.response.status === 403) {
                throw new Error('YouTube API quota exceeded');
            }
            throw error;
        }
    }

    // Parse ISO 8601 duration to seconds
    parseDuration(duration) {
        const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
        const hours = (parseInt(match[1]) || 0);
        const minutes = (parseInt(match[2]) || 0);
        const seconds = (parseInt(match[3]) || 0);
        return hours * 3600 + minutes * 60 + seconds;
    }

    // Generate embed URL
    getEmbedUrl(videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
    }

    // Get video thumbnail
    getThumbnailUrl(videoId, quality = 'hqdefault') {
        return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
    }
}

module.exports = new YouTubeService();