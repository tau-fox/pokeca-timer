# ポケカ対戦タイマー

ポケモンカードゲームの対戦用タイマーPWAです。

## 機能

- BO1 / BO3 切替
  - BO1: 25分
  - BO3: 75分
- 先攻/後攻それぞれの使用時間表示
- ターン終了ボタン
- 一時停止 / 試合再開
- リセット確認ダイアログ
- 試合終了ダイアログ
- 試合終了アラーム
  - OKを押すまで鳴り続けます
- iPhoneの回転ロックONでも使える疑似横向き表示
- 画面全体の向き反転
- PWA対応

## GitHub Pages で公開する場合

このフォルダ内のファイルを、そのままGitHubリポジトリにアップロードしてください。

アップロード対象:

```text
index.html
manifest.webmanifest
service-worker.js
icons/
```

GitHub Pagesを有効にすると、公開URLから利用できます。

## ローカル確認

```powershell
python -m http.server 8000 --bind 0.0.0.0
```

同じWi-Fi上のiPhoneから以下のようにアクセスします。

```text
http://PCのIPv4アドレス:8000/
```

## 注意

Service Workerを含む正式版です。
更新後に古い表示が残る場合は、iPhone側でページ再読み込み、SafariのWebサイトデータ削除、またはホーム画面に追加したアイコンの再作成を試してください。

## 更新履歴

### v1.1

- ホーム画面追加後のフルスクリーン表示で、時計やDynamic Islandと重なりにくいように疑似横向きレイアウトを下寄せ
- Service Workerのキャッシュ名を更新
