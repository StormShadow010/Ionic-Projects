import { MediaResult } from '@capacitor/camera';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface PhotoRecord {
  id: string;
  position: Coordinates;
  photoPath: string; // ruta del archivo de la imagen en el dispositivo
  webviewPath: string;
  description: string;
  timestamp: number; // Date.now()
}

export interface NewPhotoRecord {
  position: Coordinates;
  description: string;
  photo: MediaResult;
}
