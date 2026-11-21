// 学習者が「この内容で確定」ボタンを押した場合、
// 通常のフェーズ判定を上書きして強制的に次フェーズへ進めるための指示
export const FORCE_COMPLETE_OVERRIDE = `【最優先指示: 学習者が確定を希望しています】
これまでの対話を踏まえ、必ず現フェーズに対応する phaseComplete の値を設定してください。
- 入力確認フェーズ → "phaseComplete": "input"
- 出力確認フェーズ → "phaseComplete": "output"
- 処理手順フェーズ（1ステップ確定）→ "phaseComplete": "step"
- 処理手順フェーズ（全手順完了）→ "phaseComplete": "pseudocode"
- 疑似コードフェーズ → "phaseComplete": "pseudocode"
confirmedContent にはこれまでの対話から導いた内容を簡潔に要約して入れてください。
追加の問い返しは行わず、message は確定を伝える一言のみにしてください。`
