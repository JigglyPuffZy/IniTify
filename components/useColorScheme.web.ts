import { useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

function getSystemScheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function useColorScheme(): 'light' | 'dark' {
  const rnScheme = useRNColorScheme();
  const [scheme, setScheme] = useState<'light' | 'dark'>(() => getSystemScheme());

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event: MediaQueryListEvent) => {
      setScheme(event.matches ? 'dark' : 'light');
    };

    setScheme(media.matches ? 'dark' : 'light');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  if (rnScheme === 'dark' || rnScheme === 'light') {
    return rnScheme;
  }

  return scheme;
}
