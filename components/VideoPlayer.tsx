import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Platform, Dimensions } from 'react-native';

interface VideoPlayerProps {
  videoUrl: string;
  onProgress?: (progress: number) => void;
  onComplete?: () => void;
  autoPlay?: boolean;
}

const { width: screenWidth } = Dimensions.get('window');

export default function VideoPlayer({ 
  videoUrl, 
  onProgress, 
  onComplete, 
  autoPlay = true 
}: VideoPlayerProps) {
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const getYouTubeVideoId = (url: string) => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const getEmbedUrl = (url: string) => {
    const videoId = getYouTubeVideoId(url);
    if (!videoId) return null;
    
    return `https://www.youtube.com/embed/${videoId}?autoplay=${autoPlay ? 1 : 0}&controls=0&modestbranding=1&showinfo=0&rel=0&fs=0&disablekb=1`;
  };

  useEffect(() => {
    if (autoPlay && Platform.OS === 'web') {
      // Simulate video progress for web
      intervalRef.current = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + 1;
          onProgress?.(newProgress);
          
          if (newProgress >= 100) {
            onComplete?.();
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
            }
          }
          
          return newProgress;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoPlay, onProgress, onComplete]);

  const embedUrl = getEmbedUrl(videoUrl);

  if (!embedUrl) {
    return (
      <View style={styles.errorContainer}>
        <View style={styles.errorContent}>
          <View style={styles.errorIcon} />
        </View>
      </View>
    );
  }

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <iframe
          src={embedUrl}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            borderRadius: 8,
          }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen={false}
        />
      </View>
    );
  }

  // For mobile platforms, show a placeholder
  return (
    <View style={styles.mobileContainer}>
      <View style={styles.mobilePlaceholder}>
        <View style={styles.playIcon} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 250,
    backgroundColor: '#000',
    borderRadius: 8,
    overflow: 'hidden',
  },
  mobileContainer: {
    width: '100%',
    height: 250,
    backgroundColor: '#000',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mobilePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    width: 60,
    height: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 30,
  },
  errorContainer: {
    width: '100%',
    height: 250,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContent: {
    alignItems: 'center',
  },
  errorIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#FF4757',
    borderRadius: 24,
  },
});