import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export interface PlatformConfig {
  pricePerKm: number;
  minBaseFee: number;
  nighttimeSurcharge: number;
  asapSurcharge: number;
  roundingUnit: number;
  serviceFee: number;
  freeDeliveryEnabled: boolean;
  loaded: boolean;
}

export const DEFAULT_PLATFORM_CONFIG: Omit<PlatformConfig, 'loaded'> = {
  pricePerKm: 1200,
  minBaseFee: 2000,
  nighttimeSurcharge: 2000,
  asapSurcharge: 2000,
  roundingUnit: 100,
  serviceFee: 1000,
  freeDeliveryEnabled: true,
};

export function usePlatformConfig(): PlatformConfig {
  const [config, setConfig] = useState<PlatformConfig>({
    ...DEFAULT_PLATFORM_CONFIG,
    loaded: false,
  });

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'system_settings', 'global'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setConfig({
            pricePerKm: data.delivery?.pricePerKm ?? DEFAULT_PLATFORM_CONFIG.pricePerKm,
            minBaseFee: data.delivery?.minBaseFee ?? DEFAULT_PLATFORM_CONFIG.minBaseFee,
            nighttimeSurcharge: data.delivery?.nighttimeSurcharge ?? DEFAULT_PLATFORM_CONFIG.nighttimeSurcharge,
            asapSurcharge: data.delivery?.asapSurcharge ?? DEFAULT_PLATFORM_CONFIG.asapSurcharge,
            roundingUnit: data.delivery?.roundingUnit ?? DEFAULT_PLATFORM_CONFIG.roundingUnit,
            serviceFee: data.serviceFee ?? DEFAULT_PLATFORM_CONFIG.serviceFee,
            freeDeliveryEnabled: data.freeDeliveryEnabled !== false,
            loaded: true,
          });
        } else {
          setConfig({ ...DEFAULT_PLATFORM_CONFIG, loaded: true });
        }
      },
      (err) => {
        console.warn('Error listening to system_settings/global:', err);
        setConfig({ ...DEFAULT_PLATFORM_CONFIG, loaded: true });
      }
    );
    return () => unsub();
  }, []);

  return config;
}
