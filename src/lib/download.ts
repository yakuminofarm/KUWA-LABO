/**
 * ファイルの渡し方は開かれている場所で変わる。
 *
 * - 共有ページ (Artifact) では <a download> が効かないため、
 *   閲覧側の保存ダイアログを呼ぶ専用の口を使う。
 * - Vercel などに置いた通常のWebでは、その口が無いので Blob で普通に落とす。
 */

export interface ViewerSaveRequest {
  filename: string;
  data: string | Blob;
}

export type ViewerSave = (r: ViewerSaveRequest) => Promise<{ status: "saved" }>;

interface ClaudeRuntime {
  use?: (name: string) => Promise<unknown>;
}

/** 保存に失敗した理由。呼び出し側でメッセージを変えるために使う */
export type SaveOutcome = "saved" | "declined" | "failed";

function runtime(): ClaudeRuntime | undefined {
  return (window as unknown as { claude?: ClaudeRuntime }).claude;
}

/**
 * 閲覧側の保存機能を取りにいく。使えない場所では null。
 * use() は必ず非同期で返り、誰も応答しなければ 10秒で null になる。
 */
export async function getViewerSave(): Promise<ViewerSave | null> {
  const claude = runtime();
  if (typeof claude?.use !== "function") return null;
  try {
    const ns = (await claude.use("downloads")) as
      | { save?: ViewerSave }
      | null;
    return typeof ns?.save === "function" ? ns.save.bind(ns) : null;
  } catch {
    return null;
  }
}

function errorCode(e: unknown): string {
  return typeof e === "object" && e !== null && "code" in e
    ? String((e as { code: unknown }).code)
    : "";
}

/**
 * 端末の共有シートに渡す (iPhone向け)。
 *
 * iOSでファイルを直接ダウンロードさせると、保存先を選べないまま
 * プレビュー画面が開き、関係のないアプリを勧められてしまう。
 * 共有シートなら「ファイルに保存」やLINE・メールが普通に並ぶ。
 *
 * 使えない環境では null を返して、呼び出し側で従来の方法に回す。
 * share() は利用者の操作から間を置かずに呼ぶ必要があるので、
 * この関数の中では呼び出しより前に待ち合わせを入れないこと。
 */
async function saveViaShare(
  filename: string,
  text: string,
  mime: string
): Promise<SaveOutcome | null> {
  const nav = navigator as Navigator & {
    canShare?: (data: { files?: File[] }) => boolean;
    share?: (data: { files?: File[]; title?: string }) => Promise<void>;
  };
  if (typeof nav.share !== "function" || typeof nav.canShare !== "function") return null;

  let file: File;
  try {
    file = new File([text], filename, { type: mime });
  } catch {
    return null;
  }
  if (!nav.canShare({ files: [file] })) return null;

  try {
    await nav.share({ files: [file], title: filename });
    return "saved";
  } catch (e) {
    // 共有シートを閉じただけなら本人の意思なので、黙って引き下がる
    if (e instanceof Error && e.name === "AbortError") return "declined";
    return null; // 共有そのものが駄目だったので、他の手段に回す
  }
}

/** ブラウザに直接ダウンロードさせる (通常のWeb向け) */
function saveViaAnchor(filename: string, text: string, mime: string): SaveOutcome {
  try {
    const url = URL.createObjectURL(new Blob([text], { type: mime }));
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // すぐ revoke するとダウンロードが始まらない端末があるので少し待つ
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return "saved";
  } catch {
    return "failed";
  }
}

export async function saveTextFile(
  viewerSave: ViewerSave | null,
  filename: string,
  text: string,
  mime = "application/json"
): Promise<SaveOutcome> {
  if (viewerSave) {
    try {
      await viewerSave({ filename, data: text });
      return "saved";
    } catch (e) {
      // 断られたときは黙って引き下がる (勝手にやり直さない)
      return errorCode(e) === "declined" ? "declined" : "failed";
    }
  }
  const shared = await saveViaShare(filename, text, mime);
  if (shared) return shared;
  return saveViaAnchor(filename, text, mime);
}
