import { Service, inject, signal, computed } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Storage } from '@ionic/storage-angular';

/** Lo que se guarda en el indice: ligero, se lee entero de un golpe. */
export interface FotoMeta {
  id: string;
  fecha: number;
}

/** Lo que consume la UI: el meta + la URL lista para el <img>. */
export interface Foto extends FotoMeta {
  url: SafeUrl;
  /** La URL cruda "blob:..." — se guarda para poder revocarla despues. */
  raw: string;
}

@Service()
export class FotosService {
  private storage = inject(Storage);
  private sanitizer = inject(DomSanitizer);

  /** Promesa de inicializacion. Se guarda, NO se await-ea aqui. */
  private ready = this.storage.create();

  /** Clave del indice. Los blobs van en claves aparte: foto:<id> */
  private readonly INDICE = 'indice';

  private _fotos = signal<Foto[]>([]);
  readonly fotos = this._fotos.asReadonly();
  readonly total = computed(() => this._fotos().length);

  private _cargando = signal(true);
  readonly cargando = this._cargando.asReadonly();

  constructor() {
    this.cargar();
  }

  // ---------- Carga inicial ----------

  private async cargar(): Promise<void> {
    try {
      const db = await this.ready;
      const metas: FotoMeta[] = (await db.get(this.INDICE)) ?? [];

      const fotos: Foto[] = [];
      for (const meta of metas) {
        const blob: Blob | null = await db.get(this.clave(meta.id));
        // Si el blob no esta, la entrada quedo huerfana: la saltamos.
        if (!blob) continue;
        fotos.push(this.aFoto(meta, blob));
      }

      this._fotos.set(fotos);
    } catch (e) {
      console.error('Error cargando fotos', e);
      this._fotos.set([]);
    } finally {
      this._cargando.set(false);
    }
  }

  // ---------- API publica ----------

  /**
   * Guarda una foto nueva.
   * Orden importante: primero el blob, despues el indice.
   * Si el blob falla, no queda una entrada del indice apuntando a nada.
   */
  async agregar(blob: Blob): Promise<void> {
    const db = await this.ready;
    const meta: FotoMeta = { id: this.nuevoId(), fecha: Date.now() };

    await db.set(this.clave(meta.id), blob);

    const metas: FotoMeta[] = (await db.get(this.INDICE)) ?? [];
    await db.set(this.INDICE, [meta, ...metas]);

    // La mas reciente arriba
    this._fotos.update((lista) => [this.aFoto(meta, blob), ...lista]);
  }

  async borrar(id: string): Promise<void> {
    const db = await this.ready;

    await db.remove(this.clave(id));

    const metas: FotoMeta[] = (await db.get(this.INDICE)) ?? [];
    await db.set(
      this.INDICE,
      metas.filter((m) => m.id !== id),
    );

    // Liberar la URL o el WebView se queda con el blob en memoria
    const foto = this._fotos().find((f) => f.id === id);
    if (foto) URL.revokeObjectURL(foto.raw);

    this._fotos.update((lista) => lista.filter((f) => f.id !== id));
  }

  async limpiar(): Promise<void> {
    const db = await this.ready;

    for (const foto of this._fotos()) {
      await db.remove(this.clave(foto.id));
      URL.revokeObjectURL(foto.raw);
    }

    await db.remove(this.INDICE);
    this._fotos.set([]);
  }

  // ---------- Internos ----------

  private clave(id: string): string {
    return `foto:${id}`;
  }

  /**
   * Un Blob no se puede poner en un <img> directamente: hay que crearle una URL.
   * Y Angular bloquea las URLs "blob:" en [src], de ahi el bypass.
   */
  private aFoto(meta: FotoMeta, blob: Blob): Foto {
    const raw = URL.createObjectURL(blob);
    return {
      ...meta,
      raw,
      url: this.sanitizer.bypassSecurityTrustUrl(raw),
    };
  }

  /**
   * crypto.randomUUID() solo existe en contexto seguro.
   * Capacitor sirve la app por https://localhost, asi que funciona,
   * pero el fallback evita un crash raro si alguna vez no.
   */
  private nuevoId(): string {
    return (
      crypto.randomUUID?.() ??
      Date.now().toString(36) + Math.random().toString(36).slice(2)
    );
  }
}
