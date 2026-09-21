import { Component, CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/angular';
import { Camera } from '@capacitor/camera';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [IonHeader, IonToolbar, IonTitle, IonContent],
})
export class HomePage {
  photoUrl = signal<string | undefined>(undefined);
  constructor() {}
  async takePicture() {
    const result = await Camera.takePhoto({
      quality: 90,
      includeMetadata: true,
    });

    if (!result.webPath) {
      console.error('No se obtuvo webPath de la foto');
      return;
    }

    this.photoUrl.set(await this.webPathToBase64(result.webPath));
  }

  async webPathToBase64(webPath: string): Promise<string> {
    const response = await fetch(webPath);
    const blob = await response.blob();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}
