/**
 * 個体写真の置き場。
 *
 * もとは記録のJSONに data URI を埋め込んでいた。写真1枚が30〜50KBあるので
 * localStorage (約5MB) が100枚ほどで埋まるうえ、エサやりを1件つけるだけでも
 * 全部の写真ごと書き直していた。そこで写真だけ記録の外に出し、
 * 記録は id で参照するだけにする。
 *
 * 置き場は出し先で変わる。
 * - アプリ版: 端末のファイル (`Directory.Data`)。iOSでは Documents にあたり、
 *   端末のバックアップに含まれる。上限は実質ストレージの空き
 * - ブラウザ版: IndexedDB に blob で置く。localStorage の5MB制限から外れる
 *
 * どちらも「id をもらって写真を返す」形にそろえてあるので、
 * 呼ぶ側は出し先を気にしなくてよい。
 */
import { Capacitor } from "@capacitor/core";
import { IS_NATIVE } from "@/lib/env";
import { generateId } from "@/lib/utils";

const DIR = "photos";
const MIME = "image/jpeg";

function toBase64(dataUrl: string): string {
  const i = dataUrl.indexOf(",");
  return i === -1 ? dataUrl : dataUrl.slice(i + 1);
}

function toDataUrl(base64: string): string {
  return `data:${MIME};base64,${base64}`;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("写真を読めませんでした"));
    r.readAsDataURL(blob);
  });
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return await (await fetch(dataUrl)).blob();
}

/* ───────────────────────── アプリ版: 端末のファイル ───────────────────────── */

// プラグイン本体を async 関数から直に返すと、JS が then に応答する proxy を
// 「まだ解決していない約束」と勘違いして落ちる (src/lib/notify.ts と同じ罠)。
// 包んだモジュールのほうを返して避ける
type FsModule = typeof import("@capacitor/filesystem");
let fsModule: FsModule | null = null;
async function fs(): Promise<FsModule> {
  fsModule ??= await import("@capacitor/filesystem");
  return fsModule;
}

const filePath = (id: string) => `${DIR}/${id}.jpg`;

async function nativePut(id: string, dataUrl: string): Promise<void> {
  const { Filesystem, Directory } = await fs();
  await Filesystem.writeFile({
    path: filePath(id),
    data: toBase64(dataUrl),
    directory: Directory.Data,
    recursive: true,
  });
}

async function nativeSrc(id: string): Promise<string | undefined> {
  const { Filesystem, Directory } = await fs();
  const { uri } = await Filesystem.getUri({
    path: filePath(id),
    directory: Directory.Data,
  });
  // file:// のままでは WebView が読めないので、読める形に直す
  return Capacitor.convertFileSrc(uri);
}

async function nativeRead(id: string): Promise<string | undefined> {
  const { Filesystem, Directory } = await fs();
  try {
    const { data } = await Filesystem.readFile({
      path: filePath(id),
      directory: Directory.Data,
    });
    return typeof data === "string" ? toDataUrl(data) : await blobToDataUrl(data);
  } catch {
    return undefined;
  }
}

async function nativeRemove(id: string): Promise<void> {
  const { Filesystem, Directory } = await fs();
  try {
    await Filesystem.deleteFile({ path: filePath(id), directory: Directory.Data });
  } catch {
    // もう無いなら消す必要もない
  }
}

async function nativeList(): Promise<string[]> {
  const { Filesystem, Directory } = await fs();
  try {
    const { files } = await Filesystem.readdir({ path: DIR, directory: Directory.Data });
    return files
      .filter((f) => f.type === "file")
      .map((f) => f.name.replace(/\.jpg$/, ""));
  } catch {
    return []; // 1枚も入れていなければフォルダ自体が無い
  }
}

/* ───────────────────────── ブラウザ版: IndexedDB ───────────────────────── */

const DB_NAME = "kuwa-photos";
const STORE = "photos";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("写真の置き場を開けませんでした"));
  });
  return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const req = run(db.transaction(STORE, mode).objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error("写真を読み書きできませんでした"));
      })
  );
}

// blob の URL は作るたびに増えるので、id ごとに1本だけ持って使い回す
const objectUrls = new Map<string, string>();

function forgetObjectUrl(id: string) {
  const url = objectUrls.get(id);
  if (!url) return;
  URL.revokeObjectURL(url);
  objectUrls.delete(id);
}

async function webPut(id: string, dataUrl: string): Promise<void> {
  forgetObjectUrl(id);
  const blob = await dataUrlToBlob(dataUrl);
  await tx("readwrite", (s) => s.put(blob, id) as unknown as IDBRequest<IDBValidKey>);
}

async function webSrc(id: string): Promise<string | undefined> {
  const cached = objectUrls.get(id);
  if (cached) return cached;
  const blob = await tx<Blob | undefined>("readonly", (s) => s.get(id));
  if (!blob) return undefined;
  const url = URL.createObjectURL(blob);
  objectUrls.set(id, url);
  return url;
}

async function webRead(id: string): Promise<string | undefined> {
  const blob = await tx<Blob | undefined>("readonly", (s) => s.get(id));
  return blob ? await blobToDataUrl(blob) : undefined;
}

async function webRemove(id: string): Promise<void> {
  forgetObjectUrl(id);
  await tx("readwrite", (s) => s.delete(id) as unknown as IDBRequest<undefined>);
}

async function webList(): Promise<string[]> {
  const keys = await tx<IDBValidKey[]>("readonly", (s) => s.getAllKeys());
  return keys.map(String);
}

/* ───────────────────────── 窓口 ───────────────────────── */

/** 写真を保存して、記録に持たせる id を返す */
export async function savePhoto(dataUrl: string): Promise<string> {
  const id = generateId();
  await putPhoto(id, dataUrl);
  return id;
}

export async function putPhoto(id: string, dataUrl: string): Promise<void> {
  return IS_NATIVE ? nativePut(id, dataUrl) : webPut(id, dataUrl);
}

/** `<img src>` に渡せる形。無ければ undefined */
export async function photoSrc(id: string): Promise<string | undefined> {
  return IS_NATIVE ? nativeSrc(id) : webSrc(id);
}

/** data URI として取り出す (バックアップに埋め込むとき用) */
export async function readPhotoDataUrl(id: string): Promise<string | undefined> {
  return IS_NATIVE ? nativeRead(id) : webRead(id);
}

export async function removePhoto(id: string): Promise<void> {
  return IS_NATIVE ? nativeRemove(id) : webRemove(id);
}

/** 置き場にある写真の id 全部 (迷子の掃除に使う) */
export async function listPhotoIds(): Promise<string[]> {
  return IS_NATIVE ? nativeList() : webList();
}
