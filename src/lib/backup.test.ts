import { describe, expect, it } from "vitest";
import { BACKUP_VERSION, BackupParseError, buildBackup, parseBackup } from "@/lib/backup";

/**
 * 取り込みは、人が書き換えられるファイルから記録が入ってくる唯一の入口。
 * ここで形がそろっていないと、一覧の並べ替えや検索がその項目を手繰って落ちる
 * (画面が真っ白になり、記録を消さないと戻れない)。
 */
const file = (data: unknown, extra: Record<string, unknown> = {}) =>
  JSON.stringify({ app: "kuwarabo", version: BACKUP_VERSION, data, ...extra });

const larva = (extra: Record<string, unknown> = {}) => ({
  id: "v1",
  code: "26A-01",
  species: "オオクワガタ",
  ...extra,
});

const beetle = (extra: Record<string, unknown> = {}) => ({
  id: "b1",
  code: "26OK-A1",
  species: "オオクワガタ",
  ...extra,
});

const wrap = (o: Record<string, unknown>) => ({
  beetles: [],
  lines: [],
  larvae: [],
  expenses: [],
  ...o,
});

describe("parseBackup: 欠けた必須項目をそろえる", () => {
  it("ビン交換の履歴が無い幼虫にも、空の履歴を持たせる", () => {
    const { data } = parseBackup(file(wrap({ larvae: [larva()] })));
    expect(data.larvae[0].bottleChanges).toEqual([]);
  });

  it("履歴が配列でなくても空にする", () => {
    const { data } = parseBackup(
      file(wrap({ larvae: [larva({ bottleChanges: "こわれている" })] }))
    );
    expect(data.larvae[0].bottleChanges).toEqual([]);
  });

  it("日付の無いビン交換の行は落とす (並べ替えで手繰るため)", () => {
    const { data } = parseBackup(
      file(
        wrap({
          larvae: [
            larva({
              bottleChanges: [
                { id: "c1", date: "2026-01-01", bottleType: "菌糸ビン" },
                { id: "c2", bottleType: "日付なし" },
              ],
            }),
          ],
        })
      )
    );
    expect(data.larvae[0].bottleChanges).toHaveLength(1);
    expect(data.larvae[0].bottleChanges[0].id).toBe("c1");
  });

  it("管理番号・備考・入手日が無くても、空の文字として入れる", () => {
    const { data } = parseBackup(file(wrap({ beetles: [{ id: "b1", species: "ヒラタ" }] })));
    const b = data.beetles[0];
    expect(b.code).toBe("");
    expect(b.notes).toBe("");
    expect(b.acquiredDate).toBe("");
  });

  it("経費の日付が無くても、空の文字として入れる", () => {
    const { data } = parseBackup(
      file(wrap({ expenses: [{ id: "e1", amountYen: 1000, category: "餌" }] }))
    );
    expect(data.expenses[0].date).toBe("");
  });

  it("生き死にが書いていなければ生きている扱いにする", () => {
    const { data } = parseBackup(file(wrap({ beetles: [beetle()] })));
    expect(data.beetles[0].isAlive).toBe(true);
  });

  it("死んだと書いてあればそのまま残す", () => {
    const { data } = parseBackup(file(wrap({ beetles: [beetle({ isAlive: false })] })));
    expect(data.beetles[0].isAlive).toBe(false);
  });

  it("性別や齢は埋めない (書いていないことを書いてあるように見せないため)", () => {
    const { data } = parseBackup(file(wrap({ larvae: [larva()] })));
    expect(data.larvae[0].gender).toBeUndefined();
    expect(data.larvae[0].stage).toBeUndefined();
  });
});

describe("parseBackup: 通さないもの", () => {
  it("種類が無い記録は数えて飛ばす", () => {
    const r = parseBackup(file(wrap({ beetles: [beetle(), { id: "b2" }] })));
    expect(r.data.beetles).toHaveLength(1);
    expect(r.skipped).toBe(1);
  });

  it("id が重なっている記録は後のほうを飛ばす", () => {
    const r = parseBackup(
      file(wrap({ beetles: [beetle({ code: "先" }), beetle({ code: "後" })] }))
    );
    expect(r.data.beetles).toHaveLength(1);
    expect(r.data.beetles[0].code).toBe("先");
    expect(r.skipped).toBe(1);
  });

  it("1件も残らなければ、取り込めなかったと伝える", () => {
    expect(() => parseBackup(file(wrap({ beetles: [{ id: "b1" }] })))).toThrow(
      BackupParseError
    );
  });

  it("別のアプリのファイルは受け取らない", () => {
    expect(() => parseBackup(JSON.stringify({ app: "ほかのアプリ", data: {} }))).toThrow(
      BackupParseError
    );
  });

  it("新しい版で作られたファイルは、更新をうながす", () => {
    expect(() =>
      parseBackup(file(wrap({ beetles: [beetle()] }), { version: BACKUP_VERSION + 1 }))
    ).toThrow(/更新/);
  });

  it("JSONとして読めないものは受け取らない", () => {
    expect(() => parseBackup("こんにちは")).toThrow(BackupParseError);
  });
});

describe("parseBackup: 設定", () => {
  it("全体の目安と品種ごとの値を持ち帰れる", () => {
    const { data } = parseBackup(
      file(
        wrap({
          beetles: [beetle()],
          schedule: { pupaDaysMin: 20, pupaDaysMax: 40, digOutDays: 25, bottleChangeDays: 100 },
          speciesTuning: { オオクワガタ: { feedIntervalDays: 5, digOutDays: 45 } },
        })
      )
    );
    expect(data.schedule).toEqual({
      pupaDaysMin: 20,
      pupaDaysMax: 40,
      digOutDays: 25,
      bottleChangeDays: 100,
    });
    expect(data.speciesTuning).toEqual({ オオクワガタ: { feedIntervalDays: 5, digOutDays: 45 } });
  });

  it("設定が入っていない古いファイルでも読める", () => {
    const { data } = parseBackup(file(wrap({ beetles: [beetle()] })));
    expect(data.schedule).toBeUndefined();
    expect(data.speciesTuning).toBeUndefined();
  });

  it("全体の目安は4つそろっていなければ使わない", () => {
    const { data } = parseBackup(
      file(wrap({ beetles: [beetle()], schedule: { pupaDaysMin: 20 } }))
    );
    expect(data.schedule).toBeUndefined();
  });

  it("日数として読めない値は落とす", () => {
    const { data } = parseBackup(
      file(
        wrap({
          beetles: [beetle()],
          speciesTuning: {
            オオクワガタ: { feedIntervalDays: 5, digOutDays: "ごじゅう", pupaDaysMin: -3 },
            コクワガタ: { feedIntervalDays: "だめ" },
            "": { feedIntervalDays: 3 },
          },
        })
      )
    );
    // 読めた項目だけ残り、空になった品種は消える
    expect(data.speciesTuning).toEqual({ オオクワガタ: { feedIntervalDays: 5 } });
  });

  it("品種ごとの値が壊れていても、記録の取り込みは止めない", () => {
    const r = parseBackup(
      file(wrap({ beetles: [beetle()], speciesTuning: "こわれている", schedule: 42 }))
    );
    expect(r.data.beetles).toHaveLength(1);
    expect(r.data.speciesTuning).toBeUndefined();
    expect(r.data.schedule).toBeUndefined();
  });
});

describe("buildBackup", () => {
  it("写真を含めないときは、写真も参照も落とす", () => {
    const f = buildBackup(
      wrap({
        beetles: [beetle({ photoId: "p1" })],
        larvae: [larva({ bottleChanges: [], photoUrl: "data:image/jpeg;base64,AAA" })],
      }) as never,
      false
    );
    expect(f.data.beetles[0].photoId).toBeUndefined();
    expect(f.data.larvae[0].photoUrl).toBeUndefined();
  });

  it("書き出したものを読み直せる", () => {
    const f = buildBackup(wrap({ beetles: [beetle({ isAlive: true, notes: "" })] }) as never);
    const back = parseBackup(JSON.stringify(f));
    expect(back.data.beetles[0].code).toBe("26OK-A1");
    expect(back.skipped).toBe(0);
  });

  it("設定も往復する", () => {
    const f = buildBackup(
      wrap({
        beetles: [beetle()],
        schedule: { pupaDaysMin: 20, pupaDaysMax: 40, digOutDays: 25, bottleChangeDays: 100 },
        speciesTuning: { コクワガタ: { feedIntervalDays: 7 } },
      }) as never
    );
    const back = parseBackup(JSON.stringify(f));
    expect(back.data.schedule?.digOutDays).toBe(25);
    expect(back.data.speciesTuning).toEqual({ コクワガタ: { feedIntervalDays: 7 } });
  });

  it("写真を含めなくても設定は落とさない", () => {
    const f = buildBackup(
      wrap({ beetles: [beetle()], speciesTuning: { コクワガタ: { feedIntervalDays: 7 } } }) as never,
      false
    );
    expect(f.data.speciesTuning).toEqual({ コクワガタ: { feedIntervalDays: 7 } });
  });
});

describe("写真の欄の取り込み", () => {
  const file = (beetles: unknown[]) =>
    JSON.stringify({
      app: "kuwarabo",
      version: 1,
      data: { beetles, lines: [], larvae: [], expenses: [] },
    });

  const b = (extra: Record<string, unknown>) => ({
    id: "a",
    code: "26OK-A1",
    species: "オオクワガタ",
    acquiredDate: "2026-01-01",
    isAlive: true,
    notes: "",
    ...extra,
  });

  it("文字の配列はそのまま通す", () => {
    const { data } = parseBackup(file([b({ photoUrls: ["data:x", "data:y"] })]));
    expect(data.beetles[0].photoUrls).toEqual(["data:x", "data:y"]);
  });

  // 配列を当てにして読むので、形の違うものを通すと画面が真っ白になる
  it("配列でなければ落とす", () => {
    const { data } = parseBackup(file([b({ photoIds: "p1", photoUrls: 3 })]));
    expect(data.beetles[0].photoIds).toBeUndefined();
    expect(data.beetles[0].photoUrls).toBeUndefined();
  });

  it("混ざった中身は文字だけ残す", () => {
    const { data } = parseBackup(file([b({ photoIds: ["p1", null, 5, "", "p2"] })]));
    expect(data.beetles[0].photoIds).toEqual(["p1", "p2"]);
  });

  it("空の配列は欄そのものを空にする", () => {
    const { data } = parseBackup(file([b({ photoIds: [] })]));
    expect(data.beetles[0].photoIds).toBeUndefined();
  });

  it("写真を落として書き出すと、どの欄も残らない", () => {
    const out = buildBackup(
      {
        beetles: [b({ photoIds: ["p1"], photoUrl: "data:x", photoUrls: ["data:y"] })] as never,
        lines: [],
        larvae: [],
        expenses: [],
      },
      false
    );
    const [only] = out.data.beetles;
    expect(only.photoIds).toBeUndefined();
    expect(only.photoUrl).toBeUndefined();
    expect(only.photoUrls).toBeUndefined();
  });
});

describe("自分で足した品種の持ち出し", () => {
  // 記録が1件も無いファイルは取り込めない決まりなので、1頭だけ入れておく
  const one = {
    id: "b1",
    code: "26OK-A1",
    species: "オオクワガタ",
    acquiredDate: "2026-01-01",
    isAlive: true,
    notes: "",
  };
  const file = (customSpecies: unknown) =>
    JSON.stringify({
      app: "kuwarabo",
      version: 1,
      data: { beetles: [one], lines: [], larvae: [], expenses: [], customSpecies },
    });

  it("書き出して読み戻せる", () => {
    const out = buildBackup({
      beetles: [one] as never,
      lines: [],
      larvae: [],
      expenses: [],
      customSpecies: ["タランドゥス"],
    });
    expect(out.data.customSpecies).toEqual(["タランドゥス"]);
    expect(parseBackup(JSON.stringify(out)).data.customSpecies).toEqual(["タランドゥス"]);
  });

  // 人が触れるファイルから入ってくるので、形が違えば落とす
  it("配列でなければ落とす", () => {
    expect(parseBackup(file("タランドゥス")).data.customSpecies).toBeUndefined();
    expect(parseBackup(file(42)).data.customSpecies).toBeUndefined();
  });

  it("混ざった中身は文字だけ残す", () => {
    expect(parseBackup(file(["タランドゥス", null, 7, ""])).data.customSpecies).toEqual([
      "タランドゥス",
    ]);
  });

  it("入っていなくても読める (古いファイル)", () => {
    expect(parseBackup(file(undefined)).data.customSpecies).toBeUndefined();
  });
});
