/**
 * 記録と写真の置き場のあいだの世話。
 *
 * 1. 旧形式 (記録が data URI を抱えている) を置き場へ移して、記録は id 参照にする
 * 2. どの記録からも参照されていない写真を消す
 * 3. 書き出すときは逆に、写真の中身を記録へ埋め戻す
 *
 * バックアップから取り込んだ記録も旧形式と同じ形なので、同じ道を通る。
 * 「写真を data URI から id へ直す場所」はここ1か所だけにしてある。
 */
import { BackupData } from "@/lib/backup";
import { Beetle, Larva } from "@/types";
import { listPhotoIds, readPhotoDataUrl, removePhoto, savePhoto } from "@/lib/photoStore";
import { photoIdsOf } from "@/lib/photoRef";
import { useKuwagataStore } from "@/store/kuwagataStore";

/**
 * 旧形式の写真を置き場へ移す。戻り値は移した枚数。
 *
 * 書き込めたものだけ差し替えるので、途中で失敗しても写真は失われない
 * (次の起動でもう一度試される)。
 */
export async function migrateEmbeddedPhotos(): Promise<number> {
  const { beetles, larvae } = useKuwagataStore.getState();
  // 成虫は2枚目以降 (photoUrls) も持ちうる。バックアップから戻したときに通る
  const targets = [...beetles, ...larvae].filter((r) => r.photoUrl || embedded(r).length > 1);
  if (targets.length === 0) return 0;

  const moved = new Map<string, string[]>();
  for (const r of targets) {
    const ids: string[] = [];
    for (const dataUrl of embedded(r)) {
      try {
        // 旧形式は長辺320pxしかない。それを大きいほうとして入れておけば、
        // 一覧でも詳細でも同じ1枚が使われる (小さいほうは無いので代用される)
        ids.push(await savePhoto({ full: dataUrl }));
      } catch {
        // この1枚は次回に回す
      }
    }
    if (ids.length > 0) moved.set(r.id, ids);
  }
  if (moved.size === 0) return 0;

  // 記録の書き換えは最後に1回だけ。1件ずつ直すと、そのたびに
  // ストア全体が保存され直す。
  // 足すのは **前** から。移行を待っているあいだに写真を足した人の記録でも、
  // もともと1枚目だった写真が1枚目のまま残る
  const swapBeetle = (b: Beetle): Beetle => {
    const ids = moved.get(b.id);
    if (!ids) return b;
    return { ...b, photoIds: [...ids, ...photoIdsOf(b)], photoId: undefined, photoUrl: undefined, photoUrls: undefined };
  };
  // 幼虫は1枚のまま。複数枚にしても見分けが付かず、残す意味が薄い
  const swapLarva = (l: Larva): Larva => {
    const ids = moved.get(l.id);
    return ids ? { ...l, photoId: ids[0], photoUrl: undefined } : l;
  };

  useKuwagataStore.setState((s) => ({
    beetles: s.beetles.map(swapBeetle),
    larvae: s.larvae.map(swapLarva),
  }));

  let count = 0;
  for (const ids of moved.values()) count += ids.length;
  return count;
}

/** 記録が抱えている写真の中身。主な1枚のあとに2枚目以降が続く */
function embedded(r: { photoUrl?: string; photoUrls?: string[] }): string[] {
  return [r.photoUrl, ...(r.photoUrls ?? [])].filter((u): u is string => !!u);
}

/**
 * 1枚だけ持っていた形 (`photoId`) を `photoIds` に移す。戻り値は直した件数。
 *
 * 写真そのものは置き場にもう入っているので、記録の書き換えだけ。
 * 読むほうは `photoIdsOf` が両方を見るので急ぐ必要はないが、
 * 2つの形が残ったままだと書くときに迷うので、起動時に片付けておく。
 */
export function migrateSinglePhotos(): number {
  const { beetles } = useKuwagataStore.getState();
  const targets = beetles.filter((b) => b.photoId && !b.photoIds);
  if (targets.length === 0) return 0;

  useKuwagataStore.setState((s) => ({
    beetles: s.beetles.map((b) =>
      b.photoId && !b.photoIds ? { ...b, photoIds: [b.photoId], photoId: undefined } : b
    ),
  }));
  return targets.length;
}

/**
 * どの記録からも参照されていない写真を消す。戻り値は消した枚数。
 *
 * 登録をやめた写真・記録を消したあとの写真・入れ替えで置いていかれた写真が
 * ここで片付く。個体を消すたびに消しにいくより、取りこぼしがない。
 *
 * ただし、写真を選んだだけでまだ保存していない記録 (追加画面を開いている間) の
 * 写真は、どこからも参照されていないので迷子に見える。そのため
 * **起動直後にだけ** 呼ぶ。復帰のたびに呼ぶと、入力中の写真を消してしまう
 */
export async function sweepOrphanPhotos(): Promise<number> {
  const { beetles, larvae } = useKuwagataStore.getState();
  // 1頭が何枚も持つので、参照は数え上げる。ここを1枚ぶんしか見ないと
  // 2枚目以降を迷子と見なして消してしまう
  const used = new Set([...beetles, ...larvae].flatMap(photoIdsOf));

  let removed = 0;
  for (const id of await listPhotoIds()) {
    if (used.has(id)) continue;
    try {
      await removePhoto(id);
      removed++;
    } catch {
      // 消せなくても実害はない。次の起動でまた試される
    }
  }
  return removed;
}

/** 移行 → 掃除。順番が逆だと、移す前の写真を迷子と見なして消してしまう */
export async function upkeepPhotos(): Promise<void> {
  await migrateEmbeddedPhotos();
  migrateSinglePhotos();
  await sweepOrphanPhotos();
}

/**
 * 書き出し用に、写真の中身を記録へ埋め戻す。
 *
 * バックアップは1つのファイルで完結していてほしい (別の端末やブラウザ版へ
 * そのまま持っていける) ので、id 参照ではなく写真そのものを入れる。
 * 出てくる形は写真を抱えていた頃と同じなので、ファイルの版は上げなくてよい。
 */
export async function embedPhotos(d: BackupData): Promise<BackupData> {
  const embed = async <T extends Beetle | Larva>(r: T): Promise<T> => {
    const fromStore: string[] = [];
    for (const id of photoIdsOf(r)) {
      const url = await readPhotoDataUrl(id);
      if (url) fromStore.push(url);
    }
    // まだ移行できていない写真 (記録が中身を抱えたまま) も1枚目として通す。
    // 見えている順 (photoEntries) と同じ並びにする
    const urls = [...(r.photoUrl ? [r.photoUrl] : []), ...fromStore];
    if (urls.length === 0) return r;

    // 主な1枚は photoUrl に入れる。この欄しか知らない古いくわらぼでも
    // 1枚は読めるようにしておく
    const [main, ...rest] = urls;
    const copy: T = { ...r, photoUrl: main };
    if (rest.length > 0) (copy as Beetle).photoUrls = rest;
    delete copy.photoId;
    delete (copy as Beetle).photoIds;
    return copy;
  };

  return {
    ...d,
    beetles: await Promise.all(d.beetles.map(embed)),
    larvae: await Promise.all(d.larvae.map(embed)),
  };
}
