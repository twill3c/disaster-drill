import type { Scenario } from "@/core/types";

/**
 * TS01 津波。沿岸の海水浴場で強い揺れに遭う。
 * 「揺れたら逃げる」「高い所へ」「戻らない」の三点が骨格。
 */
export const tsunami: Scenario = {
  id: "TS01",
  title: "津波 — 海辺で強い揺れ",
  disasterType: "tsunami",
  difficulty: 3,
  introduction:
    "午後2時15分。あなたは海岸から200メートルの海水浴場にいます。標高は約3メートル。突然、立っていられないほどの強い揺れが1分以上続きました。海の方向を見ると、いつもと少し様子が違うように見えます。",
  initialState: {
    time: 0,
    safety: 55,
    health: 100,
    supplies: 30,
    information: 20,
    evacuation: 0,
    familySafety: 60,
    score: 0,
  },
  timeBudget: 2400,
  events: [
    {
      id: "ts-quake",
      title: "海辺で強い揺れ",
      description:
        "強い揺れが1分以上続きました。周囲の人たちは戸惑って立ち止まっています。海面がざわつき、沖の様子が普段と違って見えます。避難路を示す「津波避難場所」の看板が、内陸方向を指しています。",
      timeLimit: 20,
      tip: "海辺で強い揺れや長い揺れを感じたら、津波警報を待たずに、ただちに高い場所へ避難します。「揺れたら逃げる」が鉄則です。",
      actions: [
        {
          id: "run-inland",
          label: "ただちに高台へ走る",
          description: "警報を待たず、看板の方向へ",
          effects: { safety: 25, evacuation: 30, time: 180 },
          explanation: "津波避難の鉄則です。警報の発表を待つ時間が生死を分けます。近い津波は数分で到達します。",
          riskLevel: "low",
          next: "ts-hill",
        },
        {
          id: "check-phone",
          label: "スマートフォンで津波情報を確認する",
          description: "警報が出ているか調べる",
          effects: { safety: -15, information: 15, time: 180 },
          explanation: "情報確認は大切ですが、海辺では移動しながら確認します。立ち止まって調べる数分が命取りになります。",
          riskLevel: "medium",
          next: "ts-warning",
        },
        {
          id: "watch-sea",
          label: "海の様子を見る",
          description: "本当に津波が来るのか確かめる",
          effects: { safety: -35, time: 240 },
          explanation: "津波を目視できたときには、走っても逃げ切れません。津波は時速数十キロで到達します。",
          riskLevel: "high",
          next: "ts-warning",
        },
        {
          id: "find-family",
          label: "はぐれた家族を探す",
          description: "浜辺を見回して呼ぶ",
          effects: { safety: -25, familySafety: 5, time: 300 },
          explanation: "「てんでんこ」の考え方では、各自がすぐ高台へ逃げ、後で合流します。探し合って共倒れになる事故が繰り返されています。",
          riskLevel: "high",
          next: "ts-warning",
        },
      ],
    },
    {
      id: "ts-warning",
      title: "大津波警報",
      description:
        "防災行政無線が鳴り響きました。「大津波警報。予想される津波の高さは10メートル。ただちに高台へ避難してください」。海の方から、これまで聞いたことのない音が聞こえます。",
      timeLimit: 15,
      tip: "大津波警報が出たら、荷物も車も捨てて、とにかく高い所へ。10メートルの津波は3階建ての建物を越えます。",
      variants: [
        { id: "crowd", description: "避難路に人が殺到して渋滞しています。", effects: { time: 120 } },
        { id: "child", description: "近くで子どもが転んで泣いています。", effects: { time: 60 } },
        { id: "siren", description: "サイレンが途切れ、放送が聞き取れなくなりました。", effects: { information: -10 } },
      ],
      actions: [
        {
          id: "run-now",
          label: "何も持たずに高台へ全力で走る",
          description: "荷物を置いて内陸・高所へ",
          effects: { safety: 20, evacuation: 30, supplies: -10, time: 240 },
          explanation: "正しい判断です。津波避難では所持品より高さと速さが命を守ります。",
          riskLevel: "low",
          next: "ts-hill",
        },
        {
          id: "car",
          label: "車で避難する",
          description: "駐車場の車で内陸へ",
          effects: { safety: -20, evacuation: 10, time: 300 },
          explanation: "避難路の渋滞で動けなくなり、車ごと流された事例が多数あります。原則は徒歩です。",
          riskLevel: "high",
          next: "ts-traffic",
        },
        {
          id: "building",
          label: "近くの津波避難ビルへ",
          description: "5階建てのホテルの上階へ",
          effects: { safety: 15, evacuation: 25, time: 120 },
          explanation: "高台まで距離があるときは、指定された津波避難ビルの上階へ避難します。有効な選択です。",
          riskLevel: "low",
          next: "ts-building",
        },
      ],
    },
    {
      id: "ts-traffic",
      title: "渋滞した避難路",
      description:
        "避難路は車で動かなくなりました。前も後ろも車が詰まっています。時間だけが過ぎていきます。左手に高台へ続く階段が見えます。",
      tip: "車が動かなくなったら、迷わず車を捨てて走ります。車と一緒に流されるより、身一つで高い所へ。",
      actions: [
        {
          id: "abandon-run",
          label: "車を捨てて階段を駆け上がる",
          description: "鍵は挿したまま、身一つで",
          effects: { safety: 20, evacuation: 25, time: 180 },
          explanation: "正しい判断です。車を置いていくのは勇気が要りますが、命が最優先です。",
          riskLevel: "low",
          next: "ts-hill",
        },
        {
          id: "wait-traffic",
          label: "渋滞が動くのを待つ",
          description: "もう少しで抜けられるはず",
          effects: { safety: -35, time: 420 },
          explanation: "渋滞は津波到達まで解消しません。待つほど選択肢が消えます。",
          riskLevel: "high",
          next: "ts-arrival",
        },
      ],
    },
    {
      id: "ts-building",
      title: "津波避難ビル",
      description:
        "5階建てのホテルに入りました。階段には避難する人が続いています。3階まで上がったところで、外から轟音が聞こえてきました。",
      tip: "津波避難ビルでは、できるだけ上の階、できれば屋上まで上がります。「ここまで来れば大丈夫」と途中で止まらないことが大切です。",
      actions: [
        {
          id: "to-roof",
          label: "屋上まで上がる",
          description: "できるだけ高い場所へ",
          effects: { safety: 20, evacuation: 20, time: 120 },
          explanation: "予想される津波の高さが10メートルなら、3階では足りません。可能な限り高く。",
          riskLevel: "low",
          next: "ts-arrival",
        },
        {
          id: "stay-3f",
          label: "3階にとどまる",
          description: "ここまで来れば大丈夫だろう",
          effects: { safety: -20, evacuation: 10, time: 60 },
          explanation: "10メートルの津波は3階に達します。予想高さより十分に高い場所を選びます。",
          riskLevel: "high",
          next: "ts-arrival",
        },
      ],
    },
    {
      id: "ts-hill",
      title: "高台",
      description:
        "標高25メートルの高台に着きました。息が切れています。眼下の街に、白い波の壁が押し寄せてくるのが見えます。隣で「家に財布を忘れた」と言って戻ろうとする人がいます。",
      tip: "津波は繰り返し襲来し、第二波・第三波のほうが大きいこともあります。警報が解除されるまで高台を離れません。",
      actions: [
        {
          id: "stay-and-stop",
          label: "高台にとどまり、戻ろうとする人を止める",
          description: "警報解除まで動かない",
          effects: { safety: 20, evacuation: 20, familySafety: 10, time: 600 },
          explanation: "第二波以降のほうが大きいことがあります。警報解除まで留まるのが正しい行動です。",
          riskLevel: "low",
          next: "ts-arrival",
        },
        {
          id: "go-back",
          label: "波が引いたので家に戻る",
          description: "第一波が引いた隙に",
          effects: { safety: -40, health: -20, time: 600 },
          explanation: "第一波の後に戻って第二波に巻き込まれる事故が繰り返されています。津波は何度も来ます。",
          riskLevel: "high",
          next: "ts-arrival",
        },
        {
          id: "higher",
          label: "さらに高い場所へ移動する",
          description: "念のため上へ",
          effects: { safety: 10, evacuation: 10, time: 300 },
          explanation: "余裕があるなら、より高くより内陸へ。想定を超える津波の可能性に備えます。",
          riskLevel: "low",
          next: "ts-arrival",
        },
      ],
    },
    {
      id: "ts-arrival",
      title: "津波の到達",
      description:
        "津波が街を飲み込みました。家々が押し流され、車が浮いて流れていきます。あたりは水と瓦礫の海です。あなたのいる場所には水は届いていません。",
      tip: "津波の後の海岸は、瓦礫・流出した燃料・二次的な火災で危険です。近づかず、安全な場所で情報を待ちます。",
      actions: [
        {
          id: "stay-safe",
          label: "安全な場所で情報を待つ",
          description: "ラジオで津波警報の状況を確認",
          effects: { safety: 15, information: 20, evacuation: 10, time: 900 },
          explanation: "警報が解除されるまで動かないのが正しい判断です。",
          riskLevel: "low",
        },
        {
          id: "go-look",
          label: "様子を見に下へ降りる",
          description: "被害を確認したい",
          effects: { safety: -30, health: -15, time: 600 },
          explanation: "第二波・第三波が来るうえ、水中の瓦礫や燃料は非常に危険です。",
          riskLevel: "high",
        },
        {
          id: "help-others",
          label: "高台にいる人の安否を確認する",
          description: "けが人がいないか声をかける",
          effects: { safety: 5, familySafety: 20, information: 10, time: 600 },
          explanation: "安全な場所での助け合いは有効です。危険な場所へ降りての救助は消防に任せます。",
          riskLevel: "low",
        },
      ],
      nextEvent: "ts-after",
    },
    {
      id: "ts-after",
      title: "警報解除まで",
      description:
        "日が傾いてきました。ラジオは「津波警報は継続中。第三波が観測されています」と伝えています。高台には避難した人が集まり、寒さを感じ始めています。",
      tip: "避難生活では、低体温症の予防が重要です。濡れた服を替え、風を避け、体を寄せ合って暖を取ります。",
      actions: [
        {
          id: "keep-warm",
          label: "濡れた服を替え、風を避けて暖を取る",
          description: "近くの建物や毛布を分け合う",
          effects: { health: 15, safety: 10, evacuation: 15, time: 1200 },
          explanation: "低体温症は災害後の大きなリスクです。濡れた衣服は体温を急速に奪います。",
          riskLevel: "low",
        },
        {
          id: "walk-home",
          label: "警報中だが歩いて家へ向かう",
          description: "暗くなる前に確認したい",
          effects: { safety: -35, health: -15, time: 1800 },
          explanation: "警報継続中の移動は危険です。夜間の瓦礫地帯は特に危険で、救助の対象を増やします。",
          riskLevel: "high",
        },
      ],
    },
  ],
};
