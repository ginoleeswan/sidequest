import { VideoView, useVideoPlayer } from 'expo-video';
import { useEffect } from 'react';
import { Animated, StyleSheet } from 'react-native';

import { mediaUri } from '@/api/rawg';
import type { Movie } from '@/api/types';
import { useAnimatedValue } from '@/hooks/useAnimatedValue';
import { DURATION, EASING } from '@/styles/motion';

/**
 * The stage's still, coming to life after a beat.
 *
 * Both streaming references do this: linger on a slide and the artwork
 * cross-fades into a muted trailer. A still asks you to imagine the
 * game; the trailer shows it. Muted is not a detail - a page that makes
 * noise when you open it is a page people close, and no browser will
 * autoplay sound anyway - and no controls, because this is the
 * artwork moving, not a player. The game page has the player.
 *
 * Mounted only once the dwell has elapsed, so mounting is the cue:
 * it fades itself in over the still it replaces, and the slide above
 * unmounts it the moment the page changes.
 */
export function StageTrailer({ movie }: { movie: Movie }) {
  const opacity = useAnimatedValue(0);
  const player = useVideoPlayer(mediaUri(movie.data.max) ?? '', (p) => {
    p.muted = true;
    p.loop = true;
  });

  // Started from an effect, not the setup callback: the callback runs
  // while the player is still being wired to its source, and a play()
  // there resolves into nothing. After mount it takes.
  useEffect(() => {
    const started = setTimeout(() => {
      try {
        player.muted = true;
        player.play();
      } catch {
        // An autoplay the browser declines leaves the still showing,
        // which is the state the stage was already in.
      }
    }, 0);
    Animated.timing(opacity, {
      toValue: 1,
      duration: DURATION.entrance,
      easing: EASING.standard,
      useNativeDriver: true,
    }).start();
    // A loop nobody is looking at is a fan spinning up for nothing:
    // pause when the tab is hidden, resume when it comes back. Web
    // only - a native app's video is suspended with the app.
    const onVisibility = () => {
      try {
        if (document.hidden) player.pause();
        else player.play();
      } catch {
        // Same fallback as above: the still is already showing.
      }
    };
    const canListen = typeof document !== 'undefined';
    if (canListen) document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearTimeout(started);
      if (canListen)
        document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [player, opacity]);

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, { opacity }]}
      pointerEvents="none"
      testID="stage-trailer"
    >
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
      />
    </Animated.View>
  );
}
