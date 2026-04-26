import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(
    () => NetInfo.addEventListener((s) => setIsConnected(s.isConnected ?? false)),
    [],
  );

  return { isConnected };
}
