import type { Scenario } from "@/core/types";

/**
 * FL01 洪水。河川近くの 2 階建て住宅で、大雨が警戒レベル 3 → 4 と進む。
 * 早めの避難 / 様子見 / 川を見に行く / 垂直避難の分岐。
 */
export const flood: Scenario = {
  id: "FL01",
  title: "洪水 — 大雨と川の氾濫",
  disasterType: "flood",
  difficulty: 2,
  introduction:
    "午後4時。朝から激しい雨が降り続いています。あなたの家は川から300メートルの2階建てで、ハザードマップでは浸水想定区域(0.5〜3メートル)に入っています。市から「警戒レベル3 高齢者等避難」が発表されました。",
  initialState: {
    time: 0,
    safety: 75,
    health: 100,
    supplies: 70,
    information: 40,
    evacuation: 0,
    familySafety: 70,
    score: 0,
  },
  timeBudget: 7200,
  events: [
    {
      id: "fl-warning",
      title: "警戒レベル3",
      description:
        "テレビは大雨警報と河川の水位上昇を伝えています。雨脚はさらに強まる予報です。まだ道路に水は出ていません。近所の人が「川を見てくる」と言って出ていきました。",
      info: {
        title: "警戒レベルとは",
        body: "レベル3は高齢者や避難に時間がかかる人が避難を始める段階。レベル4「避難指示」で全員が危険な場所から避難します。レベル5はすでに災害が発生している状態です。",
        effects: { information: 10 },
      },
      tip: "避難は「レベル4で全員避難」。ただし夜間や道路の冠水が始まってからでは遅いので、明るいうちに、早めに動くのが原則です。",
      actions: [
        {
          id: "check-map",
          label: "ハザードマップと避難所を確認する",
          description: "避難経路と持ち物を準備する",
          effects: { information: 20, safety: 5, time: 300 },
          explanation: "自分の家の浸水リスクと避難先を把握するのは、正しい判断の土台です。",
          riskLevel: "low",
          next: "fl-level4",
        },
        {
          id: "wait-and-see",
          label: "様子を見る",
          description: "まだ大丈夫だろう",
          effects: { safety: -5, time: 1800 },
          explanation: "レベル3は準備を始める合図です。様子見で時間を失うと、暗くなってから冠水した道を歩くことになります。",
          riskLevel: "medium",
          next: "fl-level4",
        },
        {
          id: "see-river",
          label: "川の様子を見に行く",
          description: "水位を自分の目で確かめる",
          effects: { safety: -30, health: -10, time: 900 },
          explanation: "増水した川を見に行って流される事故が毎年起きています。水位は河川カメラや自治体の情報で確認します。",
          riskLevel: "high",
          next: "fl-river",
        },
        {
          id: "evacuate-early",
          label: "今すぐ避難所へ向かう",
          description: "明るいうちに徒歩で",
          effects: { evacuation: 20, safety: 10, supplies: -5, time: 1200 },
          explanation: "最も安全な選択です。早めの避難は空振りになっても失うものは少なく、遅れた避難は取り返しがつきません。",
          riskLevel: "low",
          next: "fl-shelter-early",
        },
      ],
    },
    {
      id: "fl-river",
      title: "川岸",
      description:
        "川は茶色い濁流になり、水位は堤防の上端近くまで来ています。足元の土手はぬかるんで滑ります。雨で視界が悪く、周囲に誰もいません。",
      tip: "増水した川の岸は崩れやすく、落ちたら自力では上がれません。すぐに離れます。",
      actions: [
        {
          id: "turn-back",
          label: "すぐに引き返す",
          description: "危険を感じて家へ戻る",
          effects: { safety: 5, time: 600 },
          explanation: "早く離れるのが正解です。ここで得た「水位が高い」という情報は、避難の決断に使いましょう。",
          riskLevel: "low",
        },
        {
          id: "river-photo",
          label: "写真を撮ってから戻る",
          description: "SNS に投稿したい",
          effects: { safety: -15, time: 300 },
          explanation: "撮影のために岸に近づくと、足を滑らせる危険が増します。",
          riskLevel: "high",
        },
      ],
      nextEvent: "fl-level4",
    },
    {
      id: "fl-level4",
      title: "警戒レベル4 避難指示",
      description:
        "「警戒レベル4 避難指示」が発表されました。外は暗くなり始め、道路の低い場所に水がたまっています。避難所は徒歩15分の中学校です。",
      timeLimit: 30,
      tip: "すでに道路が冠水しているときは、無理に避難所へ向かうより、自宅の2階以上や近くの頑丈な建物の上階へ「垂直避難」する判断も重要です。",
      variants: [
        { id: "power-out", description: "そのとき停電し、テレビが消えました。", effects: { information: -10 } },
        { id: "neighbor-call", description: "隣家の高齢者から「一人で不安だ」と電話がありました。", effects: { time: 300 } },
        { id: "heavier-rain", description: "雨がさらに強まり、雷も鳴り始めました。", effects: { safety: -5 } },
      ],
      actions: [
        {
          id: "walk-shelter",
          label: "徒歩で避難所へ向かう",
          description: "水はまだ足首の下。急げば間に合う",
          effects: { evacuation: 20, safety: 5, time: 1200 },
          explanation: "水深が浅く、経路が確認できているなら徒歩避難は可能です。ただし暗く、水深が増すと危険になります。",
          riskLevel: "medium",
          next: "fl-walk",
        },
        {
          id: "drive",
          label: "車で避難所へ向かう",
          description: "雨に濡れずに早く着ける",
          effects: { safety: -10, evacuation: 10, time: 600 },
          explanation: "車は30センチの冠水でエンジンが止まり、ドアが開かなくなります。冠水した道路での車の避難は非常に危険です。",
          riskLevel: "high",
          next: "fl-car",
        },
        {
          id: "vertical",
          label: "自宅の2階へ垂直避難する",
          description: "食料・水・ラジオを持って上へ",
          effects: { safety: 10, evacuation: 15, supplies: 5, time: 300 },
          explanation: "道路の冠水が始まり暗くなってからは、垂直避難が安全な選択です。浸水想定が3メートル以下で2階があれば有効です。",
          riskLevel: "low",
          next: "fl-upstairs",
        },
      ],
    },
    {
      id: "fl-walk",
      title: "冠水した道路",
      description:
        "道路の冠水が広がり、膝下まで水が来る場所があります。水は濁ってマンホールや側溝が見えません。近道の地下道が見えます。",
      tip: "冠水した道では、傘や杖で足元を探りながら歩きます。マンホールのふたが外れていることがあります。地下道・アンダーパスには絶対に入りません。",
      actions: [
        {
          id: "probe",
          label: "傘を杖にして足元を確かめながら進む",
          description: "建物側の高い場所を選んで歩く",
          effects: { safety: 10, evacuation: 10, time: 900 },
          explanation: "足元を探り、側溝やマンホールを避けながら進む正しい歩き方です。",
          riskLevel: "low",
          next: "fl-shelter",
        },
        {
          id: "underpass",
          label: "近道の地下道を通る",
          description: "早く着きたい",
          effects: { safety: -35, health: -20, time: 300 },
          explanation: "地下道やアンダーパスは最初に、深く浸水します。流れに足を取られると立てません。",
          riskLevel: "high",
          next: "fl-shelter",
        },
        {
          id: "nearby-building",
          label: "近くの高い建物に入る",
          description: "3階建ての公民館の上階へ",
          effects: { safety: 5, evacuation: 5, time: 300 },
          explanation: "避難所にこだわらず、近くの安全な建物の上階へ入るのは有効な判断です。",
          riskLevel: "medium",
          next: "fl-shelter",
        },
      ],
    },
    {
      id: "fl-car",
      title: "動かなくなった車",
      description:
        "道路の冠水部分に入ったところでエンジンが止まりました。水は車の床まで来ています。ドアが重くて開きません。",
      tip: "車が水に浸かったら、水圧でドアが開かなくなる前に脱出します。開かないときは窓を割って出ます。車内で待つのは危険です。",
      actions: [
        {
          id: "abandon-car",
          label: "車を捨てて高い場所へ",
          description: "窓から出て歩道側の高台へ",
          effects: { safety: 10, evacuation: 10, time: 600 },
          explanation: "車より命です。水位が上がる前に脱出するのが正しい判断です。",
          riskLevel: "low",
          next: "fl-shelter",
        },
        {
          id: "stay-in-car",
          label: "車内で救助を待つ",
          description: "雨に濡れたくない",
          effects: { safety: -25, health: -10, time: 1800 },
          explanation: "水位は短時間で上がり、車ごと流されることがあります。車内での待機は非常に危険です。",
          riskLevel: "high",
          next: "fl-shelter",
        },
      ],
    },
    {
      id: "fl-upstairs",
      title: "2階からの様子",
      description:
        "2階に上がりました。窓の外で道路が川のようになり、1階の床上まで水が来ています。停電し、家の中は真っ暗です。スマートフォンの電池は残り40パーセント。",
      tip: "垂直避難したら、電池を節約しながら情報を集め、救助が必要なら119番や自治体に位置を伝えます。1階には戻りません。",
      actions: [
        {
          id: "radio-and-call",
          label: "ラジオと懐中電灯を確保し、救助要請の準備をする",
          description: "居場所を家族と自治体に伝える",
          effects: { information: 15, safety: 10, familySafety: 15, time: 600 },
          explanation: "情報を得て、自分の位置を外部に知らせるのが救助への最短経路です。",
          riskLevel: "low",
        },
        {
          id: "downstairs",
          label: "1階に貴重品を取りに降りる",
          description: "水はまだ膝くらいのはず",
          effects: { safety: -25, health: -10, supplies: 10, time: 300 },
          explanation: "浸水した1階は暗く、流れがあり、ドアが開かなくなることがあります。取りに戻って亡くなる事故が実際に起きています。",
          riskLevel: "high",
        },
        {
          id: "roof",
          label: "屋根に上がる",
          description: "より高い場所へ",
          effects: { safety: -5, evacuation: 5, time: 300 },
          explanation: "2階まで水が来る恐れがあるなら有効ですが、雨の中の屋根は滑落の危険があります。今の水位なら2階で待つのが安全です。",
          riskLevel: "medium",
        },
      ],
      nextEvent: "fl-rescue",
    },
    {
      id: "fl-rescue",
      title: "夜が明けて",
      description:
        "夜が明けました。雨は弱まりましたが、道路はまだ水没しています。遠くに救助のボートが見えます。",
      tip: "救助を待つときは、目立つ色の布を振る、ライトを点滅させるなどして居場所を知らせます。自力で泳いで向かってはいけません。",
      actions: [
        {
          id: "signal",
          label: "目立つ布を振って合図する",
          description: "窓から赤いタオルを振る",
          effects: { evacuation: 20, safety: 10, time: 600 },
          explanation: "救助側に居場所を知らせる正しい方法です。",
          riskLevel: "low",
        },
        {
          id: "swim",
          label: "泳いでボートに向かう",
          description: "近いから自分で行ける",
          effects: { safety: -40, health: -30, time: 300 },
          explanation: "濁流には流木・ガラス・流れがあり、泳ぐのは極めて危険です。救助が来るまで待ちます。",
          riskLevel: "high",
        },
      ],
    },
    {
      id: "fl-shelter",
      title: "避難所に到着",
      description:
        "中学校の避難所に着きました。体育館には多くの人がいて、毛布が配られています。雨はまだ降り続いています。",
      tip: "避難所に着いたら受付をして安否を登録し、家族に居場所を伝えます。水が引いても、家に戻るのは自治体の安全確認の後です。",
      actions: [
        {
          id: "register",
          label: "受付をして家族に連絡する",
          description: "安否と居場所を伝える",
          effects: { evacuation: 15, familySafety: 20, time: 300 },
          explanation: "受付と連絡で、家族と支援者があなたの無事を把握できます。",
          riskLevel: "low",
        },
        {
          id: "check-house",
          label: "家の様子を見に戻る",
          description: "水が引いたか確かめたい",
          effects: { safety: -20, time: 1800 },
          explanation: "夜間・降雨中に冠水地域へ戻るのは危険です。水が引くまで避難所にとどまります。",
          riskLevel: "high",
        },
      ],
    },
    {
      id: "fl-shelter-early",
      title: "早めの避難所",
      description:
        "明るいうちに避難所に着きました。まだ人は少なく、席も物資も余裕があります。雨は夜にかけて強まる予報です。",
      tip: "早めに避難すると、避難所で落ち着いて情報を集め、家族との連絡もとれます。「空振り」を恐れないことが命を守ります。",
      actions: [
        {
          id: "settle",
          label: "受付をして避難情報を確認する",
          description: "家族にも居場所を伝える",
          effects: { evacuation: 15, information: 10, familySafety: 15, safety: 5, time: 600 },
          explanation: "早い避難の利点を最大限に生かした行動です。",
          riskLevel: "low",
        },
        {
          id: "go-back-for-goods",
          label: "家に戻って荷物を取りに行く",
          description: "まだ雨も弱いし、往復できる",
          effects: { safety: -20, supplies: 10, time: 1800 },
          explanation: "戻る間に状況は急変します。避難所を出て冠水に巻き込まれた事故があります。",
          riskLevel: "high",
        },
      ],
    },
  ],
};
