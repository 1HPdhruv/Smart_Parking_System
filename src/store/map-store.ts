import { create } from 'zustand';

interface MapState {
  viewport: any;
}

export const useMapStore = create<MapState>(() => ({
  viewport: { latitude: 0, longitude: 0, zoom: 10 },
}));
