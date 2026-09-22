import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonButtons,
  IonIcon,
  IonFab,
  IonFabButton,
  IonSpinner,
  IonModal,
  IonNote,
  ActionSheetController,
  AlertController,
  ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  cameraOutline,
  trashOutline,
  closeOutline,
  imagesOutline,
} from 'ionicons/icons';

import { Camera, MediaResult } from '@capacitor/camera';
import { FotosService, Foto } from '../services/Fotos.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    DatePipe,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonButtons,
    IonIcon,
    IonFab,
    IonFabButton,
    IonSpinner,
    IonModal,
    IonNote,
  ],
})
export class HomePage {
  readonly svc = inject(FotosService);
  private actionSheetCtrl = inject(ActionSheetController);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);

  /** Foto abierta en el visor. null = visor cerrado. */
  ampliada = signal<Foto | null>(null);

  /** Evita doble disparo mientras guarda. */
  ocupado = signal(false);

  constructor() {
    addIcons({ cameraOutline, trashOutline, closeOutline, imagesOutline });
  }

  // ---------- Origen de la imagen ----------

  /**
   * CameraSource.Prompt fue eliminado en la nueva API,
   * asi que el menu de "camara o galeria" lo montamos nosotros.
   */
  async elegirOrigen(): Promise<void> {
    const sheet = await this.actionSheetCtrl.create({
      header: 'Agregar foto',
      buttons: [
        { text: 'Tomar foto', icon: 'camera-outline', role: 'camara' },
        {
          text: 'Elegir de la galería',
          icon: 'images-outline',
          role: 'galeria',
        },
        { text: 'Cancelar', role: 'cancel' },
      ],
    });
    await sheet.present();

    const { role } = await sheet.onDidDismiss();
    if (role === 'camara') await this.tomarFoto();
    if (role === 'galeria') await this.elegirDeGaleria();
  }

  // ---------- Cámara ----------

  async tomarFoto(): Promise<void> {
    if (this.ocupado()) return;
    this.ocupado.set(true);

    try {
      // takePhoto es la API nueva (v8.1.0+). Ya no lleva resultType:
      // el MediaResult siempre trae webPath.
      const result = await Camera.takePhoto({
        quality: 80,
        // Sin esto llegan fotos de 12 MP (3-5 MB). Con 1024 quedan
        // en 200-400 KB y en pantalla de celular no se nota.
        // targetWidth y targetHeight van siempre juntos.
        targetWidth: 1024,
        targetHeight: 1024,
        correctOrientation: true,
      });

      await this.guardar(result);
    } catch (e) {
      this.manejarError(e);
    } finally {
      this.ocupado.set(false);
    }
  }

  // ---------- Galería ----------

  async elegirDeGaleria(): Promise<void> {
    if (this.ocupado()) return;
    this.ocupado.set(true);

    try {
      // chooseFromGallery devuelve MediaResults: { results: MediaResult[] }
      const { results } = await Camera.chooseFromGallery({
        quality: 80,
        allowMultipleSelection: true,
        limit: 10,
      });

      for (const result of results) {
        await this.guardar(result);
      }
    } catch (e) {
      this.manejarError(e);
    } finally {
      this.ocupado.set(false);
    }
  }

  // ---------- Guardado ----------

  /**
   * webPath es una URL temporal del WebView: muere al cerrar la app.
   * Hay que sacarle el Blob antes de guardarlo.
   */
  private async guardar(result: MediaResult): Promise<void> {
    if (!result.webPath) throw new Error('El resultado no trae webPath');
    const blob = await (await fetch(result.webPath)).blob();
    await this.svc.agregar(blob);
  }

  // ---------- Visor ----------

  abrir(foto: Foto): void {
    this.ampliada.set(foto);
  }

  cerrar(): void {
    this.ampliada.set(null);
  }

  // ---------- Borrado ----------

  async confirmarBorrar(foto: Foto): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar foto',
      message: '¿Seguro que quieres eliminar esta foto?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            this.cerrar();
            await this.svc.borrar(foto.id);
            this.avisar('Foto eliminada');
          },
        },
      ],
    });
    await alert.present();
  }

  async confirmarLimpiar(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Borrar todo',
      message: `Se eliminarán las ${this.svc.total()} fotos guardadas.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Borrar todo',
          role: 'destructive',
          handler: async () => {
            await this.svc.limpiar();
            this.avisar('Galería vacía');
          },
        },
      ],
    });
    await alert.present();
  }

  // ---------- Utilidades ----------

  /** Si el usuario cancela, el plugin lanza error. No es un fallo real. */
  private manejarError(e: unknown): void {
    const msg = String((e as Error)?.message ?? e);
    if (/cancel/i.test(msg)) return;
    console.error('Error con la imagen', e);
    this.avisar('No se pudo guardar la foto');
  }

  private async avisar(mensaje: string): Promise<void> {
    const toast = await this.toastCtrl.create({
      message: mensaje,
      duration: 1800,
      position: 'bottom',
    });
    await toast.present();
  }
}
