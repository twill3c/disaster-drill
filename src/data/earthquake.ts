import type { Scenario } from "@/core/types";

/**
 * EQ01 地震(元仕様 §11)。自宅リビングで大きな揺れに遭う。
 * 揺れの最中 → 収束 → 周囲確認 → 二次災害の防止 → 家族 → 避難判断 → 到着。
 */
export const earthquake: Scenario = {
  id: "EQ01",
  title: "地震 — 自宅で大きな揺れ",
  disasterType: "earthquake",
  difficulty: 1,
  introduction:
    "午前10時32分。あなたは自宅2階建ての1階リビングにいます。平日の午前で、家族は職場と学校に出ています。突然、大きな揺れが始まりました。",
  initialState: {
    time: 0,
    safety: 70,
    health: 100,
    supplies: 60,
    information: 30,
    evacuation: 0,
    familySafety: 50,
    score: 0,
  },
  timeBudget: 3600,
  events: [
    {
      id: "eq-shake",
      title: "強い揺れ",
      description:
        "突然、大きな揺れが始まりました。テレビが揺れ、本棚から本が落ちてきます。食器棚がガタガタと音を立てています。立っているのがやっとです。",
      timeLimit: 15,
      tip: "大きな揺れが続いている間は、慌てて屋外へ飛び出すのではなく、まず身の安全を確保することが重要です。落下物から頭を守り、丈夫な机の下などに身を隠します。",
      actions: [
        {
          id: "run-out",
          label: "すぐ外へ飛び出す",
          description: "玄関から道路へ走る",
          effects: { safety: -25, health: -15, time: 20 },
          explanation:
            "揺れの最中に外へ出ると、瓦・ガラス・看板などの落下物に当たる危険が高くなります。倒れそうな家具の近くも同じです。",
          riskLevel: "high",
          next: "eq-outside",
        },
        {
          id: "under-table",
          label: "テーブルの下に身を隠す",
          description: "頭を守り、テーブルの脚を持つ",
          effects: { safety: 15, time: 40 },
          explanation:
            "落下物から頭と体を守る基本行動です。テーブルの脚を持てば、テーブルが動いても守られ続けます。",
          riskLevel: "low",
        },
        {
          id: "close-window",
          label: "窓を閉めに行く",
          description: "揺れの中を窓まで歩く",
          effects: { safety: -15, health: -5, time: 25 },
          explanation:
            "揺れの中で移動すると転倒や落下物の危険があります。窓ガラスは割れて飛散することがあり、近づくのは危険です。",
          riskLevel: "high",
        },
        {
          id: "watch-tv",
          label: "テレビで情報を確認する",
          description: "揺れの中でテレビの前へ",
          effects: { safety: -8, information: 5, time: 30 },
          explanation:
            "情報は大切ですが、揺れの最中は身の安全が先です。テレビは倒れることがあり、近づくと危険です。情報は揺れが収まってから集めましょう。",
          riskLevel: "medium",
        },
      ],
      nextEvent: "eq-calm",
    },
    {
      id: "eq-outside",
      title: "屋外",
      description:
        "道路へ出ました。まだ揺れています。屋根から瓦が落ち、電柱が大きく揺れています。隣家のブロック塀がぐらついています。",
      tip: "屋外で揺れに遭ったら、ブロック塀・自動販売機・電柱・ガラス面から離れ、かばんなどで頭を守ります。",
      actions: [
        {
          id: "away-from-buildings",
          label: "建物や塀から離れて頭を守る",
          description: "開けた場所へ移動し、かばんで頭を覆う",
          effects: { safety: 10, time: 30 },
          explanation: "屋外では落下物・倒壊物から距離を取るのが最優先です。ブロック塀の倒壊は過去の地震で多くの犠牲を出しています。",
          riskLevel: "low",
        },
        {
          id: "back-home",
          label: "家に戻る",
          description: "揺れの中を玄関へ戻る",
          effects: { safety: -10, time: 40 },
          explanation: "揺れの中の往復は危険を二度受けることになります。いま安全な場所にいるなら、揺れが収まるまで動かないのが基本です。",
          riskLevel: "high",
        },
        {
          id: "crouch",
          label: "その場でしゃがむ",
          description: "動かずに揺れが収まるのを待つ",
          effects: { safety: 0, time: 20 },
          explanation: "動かないのは正しいですが、塀や電柱の近くでは落下物・倒壊の危険が残ります。少し離れてからしゃがむと安全です。",
          riskLevel: "medium",
        },
      ],
      nextEvent: "eq-calm",
    },
    {
      id: "eq-calm",
      title: "揺れが収まった",
      description:
        "揺れが収まりました。部屋の一部が散乱し、割れた食器やガラスが床に散っています。外から「ガシャーン」という音が聞こえました。スマートフォンに緊急地震速報の通知が残っています。",
      tip: "揺れが収まったら、まず足元と周囲の安全を確認します。ガラス片で足を切るけがが多いので、靴やスリッパを履きましょう。",
      actions: [
        {
          id: "to-street",
          label: "すぐ道路へ出る",
          description: "靴も履かずに外へ",
          effects: { safety: -10, evacuation: 5, time: 60 },
          explanation: "急いで外へ出ると、散乱したガラスで足を切ったり、外の落下物に当たったりします。まず足元を守り、周囲を確認してから動きます。",
          riskLevel: "medium",
          next: "eq-street",
        },
        {
          id: "check-around",
          label: "周囲の安全を確認する",
          description: "家具の倒れ・ガラス・出口を確かめる",
          effects: { safety: 10, information: 10, time: 90 },
          explanation: "出口の確保と足元の安全確認は、次の判断の土台になります。ドアが歪んで開かなくなる前に、出口を確保しておくのも大切です。",
          riskLevel: "low",
          next: "eq-gas",
        },
        {
          id: "elevator",
          label: "エレベーターで下へ行く",
          description: "1階へ早く降りたい",
          effects: { safety: -20, time: 60 },
          explanation: "地震後のエレベーターは停止・閉じ込めの危険があります。地震のあとは階段を使うのが原則です。",
          riskLevel: "high",
          next: "eq-elevator",
        },
        {
          id: "wear-shoes",
          label: "靴を履いて足を守る",
          description: "スリッパや靴を履き、懐中電灯を手に取る",
          effects: { safety: 8, health: 5, time: 60 },
          explanation: "散乱したガラスや割れ物から足を守ります。停電に備えて明かりを確保するのも良い判断です。",
          riskLevel: "low",
          next: "eq-gas",
        },
      ],
    },
    {
      id: "eq-elevator",
      title: "エレベーターの中",
      description:
        "エレベーターに乗ったところ、途中で停止しました。照明が非常灯に切り替わり、ドアは開きません。",
      tip: "閉じ込められたら、非常ボタンやインターホンで外部に連絡し、救助を待ちます。無理にドアをこじ開けると転落の危険があります。",
      actions: [
        {
          id: "call-help",
          label: "非常ボタンで連絡して待つ",
          description: "落ち着いて状況を伝える",
          effects: { safety: 5, information: 5, time: 600 },
          explanation: "正しい行動です。多くのエレベーターは地震時管制運転で最寄り階に止まりますが、止まらないときは連絡して待ちます。",
          riskLevel: "low",
        },
        {
          id: "force-door",
          label: "ドアをこじ開ける",
          description: "隙間から出ようとする",
          effects: { safety: -15, health: -10, time: 300 },
          explanation: "かごが階の途中で止まっていると、昇降路への転落や挟まれの危険があります。",
          riskLevel: "high",
        },
      ],
      nextEvent: "eq-gas",
    },
    {
      id: "eq-street",
      title: "道路の様子",
      description:
        "道路へ出ました。近所の壁の一部が崩れ、電線が垂れ下がっています。近所の人たちも出てきて、不安そうに話しています。",
      tip: "垂れ下がった電線には絶対に近づかないでください。切れた電線は通電していることがあります。",
      actions: [
        {
          id: "open-space",
          label: "広い場所へ移動する",
          description: "公園や駐車場など、落下物のない場所へ",
          effects: { safety: 10, evacuation: 10, time: 120 },
          explanation: "余震で崩れる可能性のある壁や電線から離れ、開けた場所で情報を集めるのは正しい判断です。",
          riskLevel: "low",
          next: "eq-info",
        },
        {
          id: "grab-stuff",
          label: "家に戻って荷物を取る",
          description: "貴重品と非常持ち出し袋を取りに",
          effects: { safety: -10, supplies: 15, time: 300 },
          explanation: "非常持ち出し袋は大切ですが、余震で建物に入るのは危険です。建物の損傷を確認してから、短時間で。",
          riskLevel: "medium",
          next: "eq-gas",
        },
      ],
    },
    {
      id: "eq-gas",
      title: "家の中の確認",
      description:
        "家の中を確認しています。台所からかすかにガスの臭いがします。電気は消えており、停電しているようです。",
      info: {
        title: "二次災害の防止",
        body: "地震のあとの火災の多くは、停電から復旧したときに倒れた電気製品が発火する「通電火災」と、ガス漏れによるものです。",
        effects: { information: 5 },
      },
      tip: "ガスの臭いがするときは火気厳禁。換気扇のスイッチも火花が出ることがあるので触りません。元栓を閉め、避難するときはブレーカーを落とします。",
      actions: [
        {
          id: "gas-off",
          label: "ガスの元栓を閉め、ブレーカーを落とす",
          description: "窓を開けて換気し、火は使わない",
          effects: { safety: 15, time: 120 },
          explanation: "通電火災とガス爆発の両方を防ぐ、最も重要な二次災害対策です。",
          riskLevel: "low",
        },
        {
          id: "boil-water",
          label: "コンロで湯を沸かす",
          description: "落ち着くために温かい飲み物を",
          effects: { safety: -30, health: -20, time: 120 },
          explanation: "ガスの臭いがある中で火を使うと爆発・火災につながります。ガス漏れの疑いがあるときは火気厳禁です。",
          riskLevel: "high",
        },
        {
          id: "open-window",
          label: "窓を開けて換気する",
          description: "臭いを外に逃がす",
          effects: { safety: 5, time: 60 },
          explanation: "換気は正しいですが、元栓を閉めなければ漏れは続きます。換気扇のスイッチは火花が出るので使いません。",
          riskLevel: "medium",
        },
      ],
      nextEvent: "eq-family",
    },
    {
      id: "eq-family",
      title: "家族との連絡",
      description:
        "家族の安否が気になります。スマートフォンで電話をかけましたが、回線が混雑してつながりません。",
      tip: "災害時は電話がつながりにくくなります。災害用伝言ダイヤル(171)や災害用伝言板、SNS など、あらかじめ家族で決めた連絡手段を使いましょう。",
      actions: [
        {
          id: "dial-171",
          label: "災害用伝言ダイヤルに伝言を残す",
          description: "171 に自分の無事と居場所を録音する",
          effects: { familySafety: 30, information: 10, time: 180 },
          explanation: "音声通話がつながらなくても、伝言サービスは使えることが多いです。家族が同じ番号を確認すれば安否が伝わります。",
          riskLevel: "low",
        },
        {
          id: "redial",
          label: "何度も電話をかけ直す",
          description: "つながるまでかけ続ける",
          effects: { familySafety: 5, time: 600 },
          explanation: "かけ直しは回線の混雑を悪化させ、時間も失います。緊急通報の妨げにもなるので、伝言サービスへ切り替えましょう。",
          riskLevel: "medium",
        },
        {
          id: "search",
          label: "家族を探しに出る",
          description: "学校と職場へ向かう",
          effects: { familySafety: 10, safety: -15, time: 900 },
          explanation: "道路は危険で、学校は児童を安全に保護しています。すれ違いになり、かえって安否確認が遅れます。",
          riskLevel: "high",
        },
      ],
      nextEvent: "eq-info",
    },
    {
      id: "eq-info",
      title: "避難の判断",
      description:
        "ラジオが「○○地域で震度6強を観測」と伝えています。周辺道路の一部が通行困難になっているそうです。家の壁に大きなひびは見当たりません。",
      info: {
        title: "緊急情報",
        body: "○○地域で震度6強を観測。周辺道路の一部が通行困難になっています。余震に注意してください。",
        effects: { information: 10 },
      },
      tip: "避難所へ行くか在宅避難かは、建物の安全性で決まります。倒壊の恐れがなければ在宅避難も選択肢です。避難するときは徒歩で、車は緊急車両の妨げになります。",
      variants: [
        { id: "aftershock", description: "そのとき、大きな余震が来ました。", effects: { safety: -10 } },
        { id: "blackout", description: "スマートフォンの電池が残りわずかです。", effects: { information: -10 } },
        { id: "neighbor", description: "隣家の高齢者が助けを求めています。", effects: { time: 300 } },
      ],
      actions: [
        {
          id: "walk-shelter",
          label: "情報を確認して徒歩で避難所へ",
          description: "非常持ち出し袋を持ち、ブレーカーを落として出る",
          effects: { information: 15, evacuation: 30, time: 900 },
          explanation: "避難経路の情報を確認し、徒歩で避難するのは基本どおりの行動です。",
          riskLevel: "low",
          next: "eq-shelter",
        },
        {
          id: "drive",
          label: "車で避難所へ",
          description: "荷物が多いので車で",
          effects: { safety: -15, evacuation: 10, time: 600 },
          explanation: "道路の損傷・渋滞・緊急車両の妨げになります。原則として徒歩で避難します。",
          riskLevel: "high",
          next: "eq-shelter",
        },
        {
          id: "stay-home",
          label: "建物に損傷がないので在宅避難",
          description: "家にとどまって備蓄で過ごす",
          effects: { safety: 5, evacuation: 15, supplies: 10, time: 300 },
          explanation: "建物が安全なら在宅避難は有効です。ただし余震・火災の情報には注意し、必要なら避難所へ移れるよう準備を続けます。",
          riskLevel: "medium",
          next: "eq-home",
        },
      ],
    },
    {
      id: "eq-shelter",
      title: "避難所に到着",
      description:
        "小学校の避難所に着きました。受付では名前と連絡先を記入しています。体育館には多くの人が集まっています。",
      tip: "避難所では受付で安否を登録し、家族が探せるようにします。物資は限られるので、自分の備蓄を持ち込むことが大切です。",
      actions: [
        {
          id: "register",
          label: "受付をして家族の安否を登録する",
          description: "名前を記入し、伝言板に家族への連絡を書く",
          effects: { evacuation: 20, familySafety: 15, time: 300 },
          explanation: "受付をすることで、家族や支援者があなたの所在を確認できます。",
          riskLevel: "low",
        },
        {
          id: "just-sit",
          label: "空いている場所に座る",
          description: "疲れたのでとりあえず休む",
          effects: { evacuation: 10, time: 120 },
          explanation: "休むのは大切ですが、受付をしないと安否が伝わらず、物資の配布からも漏れることがあります。",
          riskLevel: "medium",
        },
        {
          id: "go-back",
          label: "家に物を取りに戻る",
          description: "忘れた物があるので一度帰る",
          effects: { safety: -10, supplies: 10, time: 900 },
          explanation: "余震のある中で往復するのは危険です。本当に必要なものか、避難所で借りられないかを先に考えましょう。",
          riskLevel: "high",
        },
      ],
    },
    {
      id: "eq-home",
      title: "在宅避難",
      description:
        "家にとどまることにしました。停電は続いています。水道は出ますが、いつ止まるかわかりません。",
      tip: "在宅避難では、水・食料・トイレの備えが要になります。浴槽に水をためておくと、トイレや生活用水に使えます。",
      actions: [
        {
          id: "check-supplies",
          label: "備蓄と水を確認し、浴槽に水をためる",
          description: "非常食・飲料水・簡易トイレを取り出す",
          effects: { safety: 5, supplies: 20, evacuation: 10, time: 600 },
          explanation: "断水前に水を確保し、備蓄を把握するのは在宅避難の基本です。",
          riskLevel: "low",
        },
        {
          id: "just-tv",
          label: "スマートフォンで情報だけ見て過ごす",
          description: "ニュースを見続ける",
          effects: { safety: -5, information: 5, time: 600 },
          explanation: "情報収集は大切ですが、電池を消耗し、断水前の準備の時間を失います。",
          riskLevel: "medium",
        },
      ],
    },
  ],
};
