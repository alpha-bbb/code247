# Code247 README

拡張機能の作業ディレクトリに移動

```sh
cd code247
```

## コンパイル

```sh
npm run compile
```

## 動作確認

コンパイル後に `F5` を押すかツールバーから `実行` -> `デバッグの開始` を選択する

## スマホに開発中の拡張機能を入れる

### PCでするコマンド

```sh
 # カレントディレクトリを参照できるサーバを立てる
npx serve --cors -l tcp://0.0.0.0:5000

# Androidでhttp://localhost:5000にアクセスしたとき、PC上のport5000にアクセスする
adb reverse tcp:5000 tcp:5000 # Android
```

iPhoneの場合は、プロキシ設定をすればlocalhostでPCにアクセスできると思われる
localhost以外から取得しようとするとCSPエラーが発生する

### Android側ですること

1. [vscode.dev](https://vscode.dev/)を開く
2. Command Paletteから `Developer: Install Extension From Location...` を実行
3. 接続先に `http://localhost:5000` を指定

参考: [Web Extensions | Visual Studio Code Extension API](https://code.visualstudio.com/api/extension-guides/web-extensions#test-your-web-extension-in-vscode.dev)

#### エラーになる場合

下記のようなエラーが出る場合は、検証からネットワークを開いてどんなエラーが出ているか確認する。

```plaintext
Cannot find a valid extension from the location
```

## 拡張機能を作成

```sh
vsce package
```
