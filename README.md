# tennis-court-manager

## TODO
- 予約状況確認の実装
    - これはデータを保存しておく・エクスポートできるように
- ハードコートも抽選
- 1人2枠別のコートで
- 抽選状況確認の実装
- 抽選申込みの実装
- 個別申込みの実装
- GitHub Actionsでのビルド

## Windows用ビルド
1. npmライブラリのインストール
```
pnpm install
```

2. ビルド
PlayWrightのchromiumをインストール・プロジェクト内にコピー・ビルドする
管理者権限のGit Bashで以下を実行
```
pnpm run build:win
```

3. リリース
GitHubでリリースを作成して、`dist`フォルダに生成されたexeファイルを添付
