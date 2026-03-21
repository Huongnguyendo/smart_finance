import { useEffect, useRef, useState } from 'react';
import { Image, ImageStyle, Platform, StyleProp, View } from 'react-native';
import { getItem } from '../lib/storage';
import { getApiUrl } from '../lib/api';

type AuthImageProps = {
  uri: string;
  style?: StyleProp<ImageStyle>;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
};

/**
 * Image component that adds Authorization header for API-hosted images (e.g. receipts).
 * Use when the image URL is from our backend and requires JWT.
 * On web, fetches with auth and uses blob URL (img doesn't support custom headers).
 */
export function AuthImage({ uri, style, resizeMode = 'contain' }: AuthImageProps) {
  const base = getApiUrl().replace(/\/$/, '');
  const fullUri = uri.startsWith('http') ? uri : `${base}${uri}`;
  const needsAuth = uri.startsWith(base) || uri.startsWith('/api/');

  const [imageSource, setImageSource] = useState<
    { uri: string; headers?: Record<string, string> } | undefined
  >(undefined);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!needsAuth) {
      setImageSource({ uri: fullUri });
      return;
    }

    getItem('smartwallet_token').then(async (token) => {
      if (!token) {
        setImageSource(undefined);
        return;
      }
      if (Platform.OS === 'web') {
        try {
          const res = await fetch(fullUri, { headers: { Authorization: `Bearer ${token}` } });
          if (!res.ok) {
            setImageSource(undefined);
            return;
          }
          const blob = await res.blob();
          blobUrlRef.current = URL.createObjectURL(blob);
          setImageSource({ uri: blobUrlRef.current });
        } catch {
          setImageSource(undefined);
        }
      } else {
        setImageSource({ uri: fullUri, headers: { Authorization: `Bearer ${token}` } });
      }
    });

    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [uri, fullUri, needsAuth]);

  if (needsAuth && !imageSource) {
    return <View style={[style, { backgroundColor: '#1e293b' }]} />;
  }

  if (!imageSource) {
    return <View style={[style, { backgroundColor: '#1e293b' }]} />;
  }

  return (
    <Image
      source={imageSource.headers ? { uri: imageSource.uri, headers: imageSource.headers } : { uri: imageSource.uri }}
      style={style}
      resizeMode={resizeMode}
    />
  );
}
