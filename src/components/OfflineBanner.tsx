import { useState, useEffect } from 'react';
import { Network } from '@capacitor/network';

export const OfflineBanner = () => {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    Network.getStatus().then((status) => {
      setIsOffline(!status.connected);
    });

    const listener = Network.addListener('networkStatusChange', (status) => {
      setIsOffline(!status.connected);
    });

    return () => {
      listener.then((h) => h.remove());
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="bg-red-600 text-white text-xs sm:text-sm text-center py-2 px-4 fixed top-0 left-0 right-0 z-50 shadow-md font-medium dir-rtl">
      ⚠️ لا يوجد اتصال بالإنترنت. يرجى المحاولة لاحقا.
    </div>
  );
};
