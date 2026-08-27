export type Gender = "male" | "female" | "unknown";

export type KuwagataSpecies =
  // 国産
  | "オオクワガタ"
  | "ヒラタクワガタ"
  | "コクワガタ"
  | "ノコギリクワガタ"
  | "ミヤマクワガタ"
  | "アカアシクワガタ"
  | "ネブトクワガタ"
  | "ヒメオオクワガタ"
  // 外国産 オオクワ系
  | "ホペイオオクワガタ"
  | "タイワンオオクワガタ"
  | "アンタエウスオオクワガタ"
  // 外国産 ヒラタ系
  | "パラワンオオヒラタ"
  | "スマトラオオヒラタ"
  | "アルキデスヒラタクワガタ"
  | "ダイオウヒラタクワガタ"
  // 外国産 ノコギリ・フタマタ
  | "ギラファノコギリクワガタ"
  | "セアカフタマタクワガタ"
  | "マンディブラリスフタマタクワガタ"
  // 外国産 ホソアカ・キンイロ
  | "メタリフェルホソアカクワガタ"
  | "ニジイロクワガタ"
  | "パプアキンイロクワガタ"
  // 外国産 ツヤ・オウゴンオニ
  | "タランドゥスオオツヤクワガタ"
  | "レギウスオオツヤクワガタ"
  | "インターメディアツヤクワガタ"
  | "オウゴンオニクワガタ"
  | "その他";

/** 成虫個体 */
export interface Beetle {
  id: string;
  code: string;            // 管理番号 (例: 26OK-A1)
  name?: string;           // 愛称
  species: KuwagataSpecies | string;
  locality?: string;       // 産地 (例: 山梨県韮崎、スマトラ アチェ)
  generation?: string;     // 累代 (例: WD, WF1, CBF2, F5)
  gender: Gender;
  sizeMm?: number;         // 体長 (mm)
  emergedDate?: string;    // 羽化日
  acquiredDate: string;    // 入手日
  priceYen?: number;       // 入手金額 (円)
  matured?: boolean;       // 後食済み (ブリード可能な成熟状態)
  lastFedDate?: string;    // 最終給餌日 (YYYY-MM-DD)
  foodType?: string;       // この個体だけ別の餌にする場合。未設定なら全体の既定を使う
  sourceLineId?: string;   // 出身ブリードライン
  sourceLarvaId?: string;  // 幼虫台帳から引き上げた場合の元レコード
  photoUrl?: string;       // 個体写真 (リサイズ済み data URI)
  isAlive: boolean;
  isFavorite?: boolean;
  /** 動作を試すために入れた見本の記録。まとめて消せるようにするための印 */
  isSample?: boolean;
  soldDate?: string;       // 販売日
  soldPriceYen?: number;   // 販売金額 (円)
  soldTo?: string;         // 販売先 (店舗・知人など)
  notes: string;
}

/** ブリードラインの進行状況 */
export type LineStatus =
  | "pairing"        // ペアリング中
  | "laying"         // 産卵セット中
  | "waiting_split"  // 割り出し待ち
  | "split_done"     // 割り出し済み
  | "finished";      // 終了

/** ブリードライン (ペアリング〜産卵セット〜割り出しの1サイクル) */
export interface BreedingLine {
  id: string;
  name: string;            // ライン名 (例: 2026-A)
  species: KuwagataSpecies | string;
  maleId?: string;
  femaleId?: string;
  pairingDate?: string;    // ペアリング開始日
  setDate?: string;        // 産卵セット投入日
  setType?: string;        // セット内容 (産卵材/発酵マット/カワラ材/菌床)
  splitDate?: string;      // 割り出し日
  eggCount?: number;       // 採卵数
  larvaCount?: number;     // 割り出し幼虫数
  status: LineStatus;
  /** 動作を試すために入れた見本の記録。まとめて消せるようにするための印 */
  isSample?: boolean;

  notes: string;
}

/** 成長ステージ (卵→初齢→2齢→3齢→前蛹→蛹→羽化) */
export type LarvaStage = "egg" | "L1" | "L2" | "L3" | "prepupa" | "pupa" | "adult";

/** ビン交換 (菌糸ビン・マット交換) の記録 */
export interface BottleChange {
  id: string;
  date: string;
  bottleType: string;      // 菌糸ビン / 発酵マット / カワラ菌糸 など
  bottleSize?: string;     // 800cc, 1400cc など
  weightG?: number;        // 交換時体重 (g)
  costYen?: number;        // ビン・マット代 (円)
  memo?: string;
}

/** 幼虫個体 */
export interface Larva {
  id: string;
  code: string;            // 管理番号 (例: 2026-A-01)
  lineId?: string;         // 出身ライン
  species: KuwagataSpecies | string;
  stage: LarvaStage;
  gender: Gender;          // 雌雄判別結果
  hatchDate?: string;      // 孵化日 (または割り出し日)
  priceYen?: number;       // 入手金額 (購入幼虫の場合、円)
  bottleChanges: BottleChange[];
  pupaDate?: string;       // 蛹化日
  emergedDate?: string;    // 羽化日
  emergedSizeMm?: number;  // 羽化サイズ (mm)
  dugOutDate?: string;     // 掘り出し日 (羽化後に取り出した日)
  /**
   * 成虫台帳へ引き上げたときの成虫ID。
   * 引き上げても幼虫レコードは消さない — ビン交換や体重の履歴が育成の記録そのもので、
   * 掛かった費用もここから集計しているため。成虫側に費用を写すと二重計上になる。
   */
  promotedBeetleId?: string;
  photoUrl?: string;       // 個体写真 (リサイズ済み data URI)
  isAlive: boolean;
  /** 動作を試すために入れた見本の記録。まとめて消せるようにするための印 */
  isSample?: boolean;
  notes: string;
}

/** 消耗品・経費のカテゴリ */
export type ExpenseCategory =
  | "ゼリー"
  | "菌糸ビン"
  | "マット"
  | "産卵材"
  | "器具・用品"
  | "その他";

/** 消耗品・経費の記録 (個体に紐付かない共通コスト) */
export interface Expense {
  id: string;
  date: string;
  category: ExpenseCategory;
  amountYen: number;
  /** 動作を試すために入れた見本の記録。まとめて消せるようにするための印 */
  isSample?: boolean;

  memo?: string;
}

/**
 * 育成の目安にする日数。
 *
 * 飼育者ごとにやり方が違ううえ、種類・温度・菌糸の銘柄でも変わる。
 * アプリが一つの正解を押しつけるところではないので、本人が決められるようにする。
 * 既定値は飼育情報サイトで一般に言われている範囲の、安全側に寄せた値。
 */
export interface ScheduleSettings {
  /** 蛹化からこの日数を過ぎたら羽化が近いとみなす */
  pupaDaysMin: number;
  /** 蛹化からこの日数までに羽化するのが目安 */
  pupaDaysMax: number;
  /** 羽化からこの日数たてば掘り出してよい */
  digOutDays: number;
  /** ビン交換の間隔 */
  bottleChangeDays: number;
}

/** 給餌まわりの設定 (全個体に共通) */
export interface ReminderSettings {
  enabled: boolean;
  time: string;            // "HH:MM" (24時間表記)
  /** 何日おきに与えるか。1なら毎日 */
  intervalDays: number;
  /** ふだん与えている餌。個体ごとに変えたいときは Beetle.foodType で上書きする */
  foodType: string;
  /**
   * おかねの管理を見せるか。
   * 趣味として飼う人には売り買いの話が邪魔になるので、丸ごと隠せるようにする。
   */
  showCost: boolean;
}
