/**
 * 記録が持つ写真の参照を読む。
 *
 * 写真の持ち方は3代ある。どの代の記録でも同じように読めるよう、
 * 読む側はここだけを通す。
 *
 * | 形 | いつの形 |
 * |---|---|
 * | `photoIds: string[]` | いま。先頭が主な1枚 |
 * | `photoId: string` | 1枚だけ持っていた頃 |
 * | `photoUrl: string` | 写真そのものを記録に抱えていた頃 |
 *
 * 古い2つは起動時の移行 (`photoUpkeep.ts`) で `photoIds` に片付くので、
 * ふだんは `photoIds` だけが入っている。移行が済むまでのあいだも
 * 写真が消えて見えないよう、ここで面倒を見る。
 */

/** 写真を持ちうる記録 (成虫・幼虫のどちらでも通る) */
export interface PhotoHolder {
  photoIds?: string[];
  photoId?: string;
  photoUrl?: string;
}

/** `<img src>` に渡せる形に解くための参照 (KuwaUI の PhotoRef と同じ形) */
export interface PhotoEntry {
  photoId?: string;
  photoUrl?: string;
}

/**
 * 1個体に持たせる上限。
 *
 * 1枚あたり大小2つで50KBほど。上限を切らないと、1頭に20枚入れた人の
 * 端末だけが重くなる。羽化直後・今・上から・横から・大あご・裏で6枚あれば、
 * 残したい姿はだいたい収まる。
 */
export const PHOTO_MAX = 6;

/** 置き場にある写真の id。先頭が主な1枚 */
export function photoIdsOf(r: PhotoHolder): string[] {
  if (r.photoIds) return r.photoIds;
  return r.photoId ? [r.photoId] : [];
}

/**
 * 持っている写真を、見せる順に解いて返す。
 *
 * 移行前の `photoUrl` は置き場にまだ無いので id では引けない。中身を
 * そのまま先頭に置いて、移行が済むまでのあいだも1枚目として見えるようにする。
 */
export function photoEntries(r: PhotoHolder): PhotoEntry[] {
  const legacy: PhotoEntry[] = r.photoUrl ? [{ photoUrl: r.photoUrl }] : [];
  return [...legacy, ...photoIdsOf(r).map((photoId) => ({ photoId }))];
}

/** 主な1枚。一覧のサムネイル・個体カード・血統書はこれを使う */
export function mainPhotoRef(r: PhotoHolder): PhotoEntry {
  return photoEntries(r)[0] ?? {};
}

/** 何枚持っているか */
export function photoCount(r: PhotoHolder): number {
  return photoEntries(r).length;
}

/**
 * 写真を入れ替えるときに記録へ書く値。
 *
 * `photoUrl` は消さない。data URI を置き場へ移すのは移行の仕事で、
 * ここで消すと移し終える前に中身ごと失う。移行のほうは `photoIds` の
 * **前に足す** ので、入れ替えたぶんとぶつからない。
 */
export function photoPatch(ids: string[]): { photoIds?: string[]; photoId: undefined } {
  return { photoIds: ids.length > 0 ? ids : undefined, photoId: undefined };
}
