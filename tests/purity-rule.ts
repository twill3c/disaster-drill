/**
 * N-01 の判定規則。テストから直接呼ぶために切り出してある。
 *
 * - 行コメント(`//`)と塊コメント(`/* ... *\/`)を落としてから走査する(言及は違反でない)
 * - 識別子の一部(`windowSize`)を撃たないよう、前後に識別子文字が無いことを要求する
 */

export interface Violation {
  line: number;
  token: string;
}

const FORBIDDEN: RegExp[] = [
  /(?<![\w$])Math\.random\s*\(/,
  /(?<![\w$])Date\.now\s*\(/,
  /(?<![\w$])new\s+Date\s*\(/,
  /(?<![\w$])window(?![\w$])/,
  /(?<![\w$])document(?![\w$])/,
  /(?<![\w$])localStorage(?![\w$])/,
];

function stripComments(src: string): string {
  // 塊コメントは行数を保つため、中身を改行だけに置き換える
  const noBlock = src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
  return noBlock
    .split("\n")
    .map((l) => l.replace(/\/\/.*$/, ""))
    .join("\n");
}

export function findViolations(src: string): Violation[] {
  const out: Violation[] = [];
  stripComments(src)
    .split("\n")
    .forEach((line, i) => {
      for (const re of FORBIDDEN) {
        const m = re.exec(line);
        if (m) out.push({ line: i + 1, token: m[0] });
      }
    });
  return out;
}
