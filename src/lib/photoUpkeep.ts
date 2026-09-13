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
import { listPhotoIds, readPhotoDataUrl, removePhoto, savePhoto } from "@/lib/photoStore";
import { useKuwagataStore } from "@/store/kuwagataStore";

/**
 * 旧形式の写真を置き場へ移す。戻り値は移した枚数。
 *
 * 書き込めたものだけ差し替えるので、途中で失敗しても写真は失われない
 * (次の起動でもう一度試される)。
 */
export async function migrateEmbeddedPhotos(): Promise<number> {
  const { beetles, larvae } = useKuwagataStore.getState();
  const targets = [...beetles, ...larvae].filter((r) => r.photoUrl);
  if (targets.length === 0) return 0;

  const moved = new Map<string, string>();
  for (const r of targets) {
    try {
      // 旧形式は長辺320pxしかない。それを大きいほうとして入れておけば、
      // 一覧でも詳細でも同じ1枚が使われる (小さいほうは無いので代用される)
      moved.set(r.id, await savePhoto({ full: r.photoUrl! }));
    } catch {
      // この1枚は次回に回す
    }
  }
  if (moved.size === 0) return 0;

  // 記録の書き換えは最後に1回だけ。1件ずつ直すと、そのたびに
  // ストア全体が保存され直す
  const swap = <T extends { id: string; photoId?: string; photoUrl?: string }>(r: T): T => {
    const photoId = moved.get(r.id);
    return photoId ? { ...r, photoId, photoUrl: undefined } : r;
  };
  useKuwagataStore.setState((s) => ({
    beetles: s.beetles.map(swap),
    larvae: s.larvae.map(swap),
  }));

  return moved.size;
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
  const used = new Set(
    [...beetles, ...larvae].map((r) => r.photoId).filter((id): id is string => !!id)
  );

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
  const embed = async <T extends { photoId?: string; photoUrl?: string }>(r: T): Promise<T> => {
    // 旧形式のまま持っているもの・写真が無いものはそのまま
    if (r.photoUrl || !r.photoId) return r;
    const photoUrl = await readPhotoDataUrl(r.photoId);
    if (!photoUrl) return r;
    const copy = { ...r, photoUrl };
    delete copy.photoId;
    return copy;
  };

  return {
    ...d,
    beetles: await Promise.all(d.beetles.map(embed)),
    larvae: await Promise.all(d.larvae.map(embed)),
  };
}
