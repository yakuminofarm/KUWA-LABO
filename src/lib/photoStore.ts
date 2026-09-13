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
 * 1枚の写真は大小2つで持つ (`lib/photo.ts` を参照)。
 * どちらも「id と大きさをもらって写真を返す」形にそろえてあるので、
 * 呼ぶ側は出し先を気にしなくてよい。
 */
import { Capacitor } from "@capacitor/core";
import { IS_NATIVE } from "@/lib/env";
import type { PhotoSizes } from "@/lib/photo";
import { generateId } from "@/lib/utils";

const DIR = "photos";
const MIME = "image/jpeg";

export type PhotoSize = "full" | "thumb";

/**
 * 置き場での呼び名。小さいほうは id のうしろに `-s` を付ける。
 * id は英数字だけ (lib/utils.ts の generateId) なので `-s` と紛れない
 */
const nameOf = (id: string, size: PhotoSize) => (size === "thumb" ? `${id}-s` : id);
const idOf = (name: string) => (name.endsWith("-s") ? name.slice(0, -2) : name);
const other = (size: PhotoSize): PhotoSize => (size === "full" ? "thumb" : "full");

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

const filePath = (name: string) => `${DIR}/${name}.jpg`;

async function nativePut(name: string, dataUrl: string): Promise<void> {
  const { Filesystem, Directory } = await fs();
  await Filesystem.writeFile({
    path: filePath(name),
    data: toBase64(dataUrl),
    directory: Directory.Data,
    recursive: true,
  });
}

async function nativeSrc(name: string): Promise<string | undefined> {
  const { Filesystem, Directory } = await fs();
  try {
    // getUri は在りかを組み立てるだけで、無いファイルのURLも返してくる。
    // stat なら在ることを確かめたうえで同じURLがもらえる
    const { uri } = await Filesystem.stat({
      path: filePath(name),
      directory: Directory.Data,
    });
    // file:// のままでは WebView が読めないので、読める形に直す
    return Capacitor.convertFileSrc(uri);
  } catch {
    return undefined;
  }
}

async function nativeRead(name: string): Promise<string | undefined> {
  const { Filesystem, Directory } = await fs();
  try {
    const { data } = await Filesystem.readFile({
      path: filePath(name),
      directory: Directory.Data,
    });
    return typeof data === "string" ? toDataUrl(data) : await blobToDataUrl(data);
  } catch {
    return undefined;
  }
}

async function nativeRemove(name: string): Promise<void> {
  const { Filesystem, Directory } = await fs();
  try {
    await Filesystem.deleteFile({ path: filePath(name), directory: Directory.Data });
  } catch {
    // もう無いなら消す必要もない
  }
}

async function nativeList(): Promise<string[]> {
  const { Filesystem, Directory } = await fs();
  try {
    const { files } = await Filesystem.readdir({ path: DIR, directory: Directory.Data });
    return files.filter((f) => f.type === "file").map((f) => f.name.replace(/\.jpg$/, ""));
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

// blob の URL は作るたびに増えるので、呼び名ごとに1本だけ持って使い回す
const objectUrls = new Map<string, string>();

function forgetObjectUrl(name: string) {
  const url = objectUrls.get(name);
  if (!url) return;
  URL.revokeObjectURL(url);
  objectUrls.delete(name);
}

async function webPut(name: string, dataUrl: string): Promise<void> {
  forgetObjectUrl(name);
  const blob = await dataUrlToBlob(dataUrl);
  await tx("readwrite", (s) => s.put(blob, name) as unknown as IDBRequest<IDBValidKey>);
}

async function webSrc(name: string): Promise<string | undefined> {
  const cached = objectUrls.get(name);
  if (cached) return cached;
  const blob = await tx<Blob | undefined>("readonly", (s) => s.get(name));
  if (!blob) return undefined;
  const url = URL.createObjectURL(blob);
  objectUrls.set(name, url);
  return url;
}

async function webRead(name: string): Promise<string | undefined> {
  const blob = await tx<Blob | undefined>("readonly", (s) => s.get(name));
  return blob ? await blobToDataUrl(blob) : undefined;
}

async function webRemove(name: string): Promise<void> {
  forgetObjectUrl(name);
  await tx("readwrite", (s) => s.delete(name) as unknown as IDBRequest<undefined>);
}

async function webList(): Promise<string[]> {
  const keys = await tx<IDBValidKey[]>("readonly", (s) => s.getAllKeys());
  return keys.map(String);
}

/* ───────────────────────── 窓口 ───────────────────────── */

const put = (name: string, dataUrl: string) =>
  IS_NATIVE ? nativePut(name, dataUrl) : webPut(name, dataUrl);
const srcOf = (name: string) => (IS_NATIVE ? nativeSrc(name) : webSrc(name));
const readOf = (name: string) => (IS_NATIVE ? nativeRead(name) : webRead(name));
const removeOf = (name: string) => (IS_NATIVE ? nativeRemove(name) : webRemove(name));

/** 写真を保存して、記録に持たせる id を返す */
export async function savePhoto(sizes: PhotoSizes): Promise<string> {
  const id = generateId();
  await putPhoto(id, sizes);
  return id;
}

export async function putPhoto(id: string, sizes: PhotoSizes): Promise<void> {
  await put(nameOf(id, "full"), sizes.full);
  if (sizes.thumb) await put(nameOf(id, "thumb"), sizes.thumb);
}

/**
 * `<img src>` に渡せる形。
 * 欲しい大きさが無ければもう一方で代える — 移行してきた古い写真は
 * 小さいほう (長辺320px) しか無く、それは一覧でも詳細でも使えるため
 */
export async function photoSrc(
  id: string,
  size: PhotoSize = "thumb"
): Promise<string | undefined> {
  return (await srcOf(nameOf(id, size))) ?? (await srcOf(nameOf(id, other(size))));
}

/** data URI として取り出す (バックアップに埋め込むとき用)。大きいほうを優先する */
export async function readPhotoDataUrl(id: string): Promise<string | undefined> {
  return (await readOf(nameOf(id, "full"))) ?? (await readOf(nameOf(id, "thumb")));
}

export async function removePhoto(id: string): Promise<void> {
  await removeOf(nameOf(id, "full"));
  await removeOf(nameOf(id, "thumb"));
}

/** 置き場にある写真の id 全部 (迷子の掃除に使う)。大小は1つにまとめて数える */
export async function listPhotoIds(): Promise<string[]> {
  const names = IS_NATIVE ? await nativeList() : await webList();
  return [...new Set(names.map(idOf))];
}
