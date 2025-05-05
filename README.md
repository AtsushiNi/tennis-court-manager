# Tennis Court Manager
都営テニスコートを自動的に抽選申込み・予約・確認するプロジェクト

## 主に使用するフォルダ

### input
抽選申込みしたいコート・日時の情報など、各種設定を格納するフォルダ
- members.csv
    - 都営カードの情報
- lotterySetting.json
    - 抽選申込みの設定

### output
コマンドを実行した結果が格納されるフォルダ  
再度コマンドを実行すると、このフォルダ内のファイルは上書きされる物が多い
- lotteryInfo.csv
    - `npm run lottery-all`を実行すると作成される、抽選申込みに関する情報
    - このファイル内の`lotteryNo`を指定することで、`npm run lottery-by-range`で個別に抽選申込み処理を実行できる

### logs
詳細なログが保存されるフォルダ  
このフォルダ内のファイルは自由に削除してOK

## 使い方
### 0. 準備
#### 1. Git, Nodeのインストール

#### 2. 本プロジェクトをクローン
```
git clone git@github.com:AtsushiNi/tennis-court-manager.git
```

#### 3. 依存ライブラリのインストール
```
npm install
```

### 1. 抽選申込み
- 実行期間: 毎月1日~10日の間
- 実行前の準備
    1. `members.csv`に都営カードの情報を保存
    1. `lotterySetting.json`に抽選申込みしたい情報を記載
        - `targets`の数だけ、コマンド実行時に並行実行される
- 実行コマンド: `npm run lottery-all`
- 実行される処理内容
    1. 設定項目を読み込む
    1. `lotteryInfo.csv`が作成される
    1. 抽選申込み処理を並行実行する

#### (参考)個別実行
- 使用ケース
    - 後からユーザーを追加したい場合
    - コートを追加したい場合
    - リストの最後の方だけ申込み処理を実行したい場合
    - 並行実行したくない場合
- 実行方法
    1. `lotteryInfo.csv`を修正
    2. `npm run lottery-by-range`を実行
    3. 実行したい`lotteryNo`の範囲を入力

#### (参考)状況確認
- 使用ケース
    - ログインできないユーザーを見つけたい
    - 正しく抽選予約できているか確認したい
- 実行方法
    1. `npm run check-status`を実行
    1. `output/status.csv`, `output/status_summary.json`を確認
