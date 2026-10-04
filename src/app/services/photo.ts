import { Service, signal } from '@angular/core';
import { NewPhotoRecord, PhotoRecord } from '../models/photo-record';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { MediaResult } from '@capacitor/camera';
import { Preferences } from '@capacitor/preferences';

const STORAGE_KEY = 'photo-records';

@Service()
export class PhotoStore {
  constructor() {
    // Se ejecuta una sola vez: la primera vez que alguien inyecta el store
    this.load();
  }
  // Estado privado: solo este service puede modificarlo
  private readonly _records = signal<PhotoRecord[]>([]);

  // Versión pública de solo lectura para los componentes
  readonly records = this._records.asReadonly();

  async add(data: NewPhotoRecord) {
    const { photoPath, webviewPath } = await this.savePicture(data.photo);

    const record: PhotoRecord = {
      id: crypto.randomUUID(),
      position: data.position,
      description: data.description,
      photoPath,
      webviewPath,
      timestamp: Date.now(),
    };

    this._records.update((list) => [...list, record]);
    await this.persist();
  }

  // Guarda la lista completa en Preferences como JSON
  private async persist() {
    await Preferences.set({
      key: STORAGE_KEY,
      value: JSON.stringify(this._records()),
    });
  }
  // Copia la foto de la cámara a un archivo permanente y devuelve sus rutas
  private async savePicture(photo: MediaResult) {
    if (!photo.webPath) {
      throw new Error('La foto no tiene webPath');
    }

    // 1. Descargar la foto como Blob (funciona igual en web y en Android)
    const response = await fetch(photo.webPath);
    const blob = await response.blob();

    // 2. Convertirla a base64, que es lo que acepta Filesystem
    const base64 = await this.blobToBase64(blob);

    // 3. Escribir el archivo en la carpeta privada de la app
    const fileName = `${crypto.randomUUID()}.jpeg`;
    const saved = await Filesystem.writeFile({
      path: fileName,
      data: base64,
      directory: Directory.Data,
    });

    // 4. Devolver las rutas según la plataforma
    if (Capacitor.isNativePlatform()) {
      return {
        photoPath: saved.uri,
        webviewPath: Capacitor.convertFileSrc(saved.uri),
      };
    }

    return {
      photoPath: fileName,
      webviewPath: photo.webPath,
    };
  }

  // Convierte un Blob en base64 puro (sin el prefijo "data:image/...;base64,")
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = () => {
        const dataUrl = reader.result as string;
        resolve(dataUrl.split(',')[1]);
      };
      reader.readAsDataURL(blob);
    });
  }
  // Lee la lista guardada y recalcula cómo mostrar cada foto
  async load() {
    const { value } = await Preferences.get({ key: STORAGE_KEY });
    if (!value) return; // nunca se ha guardado nada

    const saved: PhotoRecord[] = JSON.parse(value);

    const records = await Promise.all(
      saved.map(async (record) => ({
        ...record,
        webviewPath: await this.resolveWebviewPath(record.photoPath),
      })),
    );

    this._records.set(records);
  }

  // Convierte la ruta guardada en una URL que entienda <img>
  private async resolveWebviewPath(photoPath: string): Promise<string> {
    if (Capacitor.isNativePlatform()) {
      return Capacitor.convertFileSrc(photoPath);
    }

    try {
      const file = await Filesystem.readFile({
        path: photoPath,
        directory: Directory.Data,
      });

      return file.data instanceof Blob
        ? URL.createObjectURL(file.data)
        : `data:image/jpeg;base64,${file.data}`;
    } catch {
      return ''; // el archivo ya no existe
    }
  }
}
