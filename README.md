# 鑑賞・読書きろく（kanriapp）

アニメ・小説・映画の視聴/読書記録を管理する個人用 Web アプリです。
iPhone の Safari でホーム画面に追加すると、アプリのように使えます（PWA）。

- サーバー・ログイン不要。データはすべて **端末内（IndexedDB）** に保存されます
- オフラインでも記録の閲覧・編集ができます
- アニメは AniList、小説は Google Books から作品情報を検索・自動入力できます（映画は手入力）

---

## 目次

1. [ローカルでの動作確認](#1-ローカルでの動作確認)
2. [GitHub Pages での公開手順](#2-github-pages-での公開手順)
3. [Google Books の API キー（任意）](#3-google-books-の-api-キー任意)
4. [iPhone でホーム画面に追加する](#4-iphone-でホーム画面に追加する)
5. [バックアップの取り方](#5-バックアップの取り方)
6. [プロジェクト構成と拡張のしかた](#6-プロジェクト構成と拡張のしかた)

---

## 1. ローカルでの動作確認

必要なもの：[Node.js](https://nodejs.org/ja) 20 以上（LTS 版を推奨）

```bash
npm install
npm run dev
```

ブラウザで表示された URL（通常は http://localhost:5173/ ）を開きます。

### 本番ビルドの確認（PWA・オフライン動作のテスト）

開発サーバーでは Service Worker が動かないため、オフライン動作はビルドして確認します。

```bash
npm run build
npm run preview
```

表示された URL（例: http://localhost:4173/kanrikanriapp2/ ）を開きます。

### iPhone の実機で確認する

PC と iPhone を同じ Wi-Fi につなぎ、次のコマンドで起動すると表示される `Network:` の URL を iPhone の Safari で開きます。

```bash
npm run dev -- --host
```

※ Service Worker（オフライン動作）は https でないと動かないため、実機での PWA の確認は GitHub Pages に公開してから行うのが簡単です。

---

## 2. GitHub Pages での公開手順

1. GitHub で新しいリポジトリを作成します（例: `kanriapp`）。
2. このフォルダをリポジトリに push します。

   ```bash
   git init
   git add .
   git commit -m "first commit"
   git branch -M main
   git remote add origin https://github.com/<ユーザー名>/<リポジトリ名>.git
   git push -u origin main
   ```

3. GitHub のリポジトリ画面で **Settings → Pages** を開き、
   **Build and deployment → Source** を **「GitHub Actions」** に変更します。
4. `main` ブランチに push するたびに `.github/workflows/deploy.yml` が実行され、自動で公開されます。
   進み具合はリポジトリの **Actions** タブで確認できます。
5. 公開 URL は `https://<ユーザー名>.github.io/<リポジトリ名>/` です。

### 公開パス（base）について

`vite.config.ts` の `base` は次のように自動で決まります。

| 状況 | base |
| --- | --- |
| GitHub Actions でのビルド | リポジトリ名から自動設定（`/<リポジトリ名>/`） |
| リポジトリ名が `<ユーザー名>.github.io` | `/` |
| ローカルでの `npm run build` | `vite.config.ts` の `REPO_NAME`（初期値 `kanrikanriapp2`） |
| 環境変数 `BASE_PATH` を指定 | その値を優先 |

リポジトリ名を変える場合は、ローカルでのビルド確認用に `vite.config.ts` の `REPO_NAME` も合わせて変更してください（Actions でのビルドは自動で合います）。

---

## 3. Google Books の API キー（任意）

小説の検索は API キーなしでも動く仕組みになっていますが、キーなしのリクエストは
**世界中の利用者で共有の1日の回数枠** を使うため、実際にはすぐ「検索回数の上限に達しました」になることが多いです。
小説の検索を使う場合は **キーの登録をおすすめします**（無料で取得できます）。

> ⚠️ API キーはソースコードやリポジトリに **書かないでください**。GitHub Pages のコードは誰でも見られます。
> このアプリではキーを設定画面から入力し、端末内（IndexedDB）にのみ保存します。バックアップにも含まれません。

### キーの取得

1. [Google Cloud Console](https://console.cloud.google.com/) に Google アカウントでログインします。
2. 画面上部のプロジェクト選択から **新しいプロジェクト** を作成します（名前は任意）。
3. **API とサービス → ライブラリ** で「Books API」を検索し、**有効にする** を押します。
4. **API とサービス → 認証情報 → 認証情報を作成 → API キー** でキーを作成します。
5. （推奨）作成したキーの編集画面で制限をかけます。
   - **アプリケーションの制限**：「ウェブサイト」を選び、`https://<ユーザー名>.github.io/*` を追加
   - **API の制限**：「キーを制限」で **Books API** のみにする

Books API の利用は通常無料の範囲（1日あたりの上限あり）で使えます。

### アプリへの登録

1. アプリの **設定** タブを開きます。
2. 「Google Books APIキー（任意）」の欄にキーを貼り付けて **保存** を押します。
3. 以降の小説の検索で自動的にキーが使われます。変更・削除も同じ画面から行えます。

---

## 4. iPhone でホーム画面に追加する

1. iPhone の **Safari** で公開 URL（`https://<ユーザー名>.github.io/<リポジトリ名>/`）を開きます。
2. 画面下の **共有ボタン**（□に↑のアイコン）をタップします。
3. **「ホーム画面に追加」** を選び、右上の **追加** をタップします。
4. ホーム画面のアイコンから起動すると、アドレスバーのないアプリ表示になります。

- 一度開いたあとはオフラインでも起動・記録の閲覧・編集ができます（作品検索だけは通信が必要です）。
- 一度表示した作品画像は端末にキャッシュされ（最大 300 件）、オフラインでも表示されます。
- アプリを更新（push）したときは、アプリを開き直すと自動で新しいバージョンになります。
- ホーム画面のアプリと Safari のタブではデータの保存場所が別です。**普段はホーム画面のアイコンから使ってください。**

---

## 5. バックアップの取り方

データは iPhone の中にしか保存されていません。アプリの削除・機種変更・ストレージ整理で消える可能性があるため、定期的にバックアップしてください。

### 書き出し（エクスポート）

1. **設定 → バックアップ → 書き出す** をタップします。
2. 共有シートが開くので **「"ファイル"に保存」** を選び、iCloud Drive などの保存先を選びます。
   （ファイル名は `kanriapp-backup-日付-時刻.json`）

### 読み込み（インポート）

1. **設定 → バックアップ → 読み込む** をタップし、「ファイル」アプリから JSON を選びます。
2. 読み込み方法を選びます。
   - **追加**：今の記録を残したまま追加します。外部ID（AniList ID / Google Books ID）が同じ作品はスキップします。
     外部IDのない作品は、種別・タイトル・登録日時がすべて同じもの（同じバックアップの再読み込み）だけスキップします。
   - **上書き**：今の記録と評価軸をすべて削除し、バックアップの内容に置き換えます。

※ API キーはバックアップに含まれないため、機種変更時は設定画面で再登録してください。

---

## 6. プロジェクト構成と拡張のしかた

```
src/
├─ types.ts              データモデル（Work, RatingAxis, MediaType など）
├─ db/
│  ├─ db.ts              Dexie のスキーマ定義・初期評価軸
│  ├─ repo.ts            作品・評価軸・設定の読み書き、評価平均の計算
│  └─ backup.ts          JSON エクスポート/インポート
├─ api/
│  ├─ types.ts           共通の検索結果型 SearchResult / SearchProvider / ApiError
│  ├─ http.ts            fetch 共通処理（オフライン・429・HTTP エラーの変換）
│  ├─ anilist.ts         AniList GraphQL（アニメ）
│  ├─ googleBooks.ts     Google Books（小説）
│  └─ index.ts           種別 → 検索プロバイダの登録表
├─ hooks/                ルーティング・デバウンス・外部検索・データ取得
├─ components/           ポスター画像、バッジ、★評価、タグ入力、ダイアログなど
└─ pages/                一覧 / 追加・編集 / 詳細 / 設定
```

### データモデル（抜粋）

```ts
interface Work {
  id?: number;
  title: string;
  mediaType: 'anime' | 'novel' | 'movie';
  status: 'planned' | 'in_progress' | 'completed' | 'dropped';
  date?: string;            // 鑑賞日・読了日 YYYY-MM-DD
  creator?: string;         // 作者・監督・制作会社
  year?: number;            // 公開年・発売年
  synopsis?: string;
  imageUrl?: string;        // 詳細用（画像ファイル自体は保存しない）
  thumbnailUrl?: string;    // 一覧用
  external?: { source: 'anilist' | 'googleBooks' | 'tmdb'; id: string };
  externalKey?: string;     // "anilist:12345"（重複チェック用インデックス）
  tags: string[];
  memo?: string;
  ratings: Record<string, number>; // 評価軸ID → 1〜5
  createdAt: number;
  updatedAt: number;
}
```

評価は「評価軸ID」をキーに保存しているので、評価軸の名前変更や並べ替えをしても過去の評価はそのまま残ります。

### 映画（TMDB）に対応するには

1. `src/api/tmdb.ts` を作り、`SearchProvider` を実装します（`anilist.ts` が参考になります）。

   ```ts
   export const tmdbProvider: SearchProvider = {
     source: 'tmdb',
     mediaType: 'movie',
     label: 'TMDB',
     apiKey: { required: true, label: 'TMDB APIキー', helpUrl: 'https://www.themoviedb.org/settings/api' },
     pageUrl: (id) => `https://www.themoviedb.org/movie/${id}`,
     async search(query, opts) {
       // fetchJson で検索し、SearchResult[] に変換して返す
       // 画像: https://image.tmdb.org/t/p/w185{poster_path}（一覧）/ w500（詳細）
     },
   };
   ```

2. `src/api/index.ts` の登録表に `movie: tmdbProvider,` を追加します。

これだけで、追加画面での映画の検索・自動入力、登録済み判定、設定画面の API キー入力欄が有効になります。

### そのほかの拡張のヒント

- **統計グラフ**：`useWorks()` / `useAxes()` で全データが取れるので、`pages/StatsPage.tsx` を追加し、
  `hooks/useRoute.ts` にルート、`components/TabBar.tsx` にタブを足します。
- **複数端末での同期**：保存処理は `db/repo.ts` に集約されています。各作品は `updatedAt` を持つので、
  同期処理（例: Dexie Cloud、各自のクラウドストレージへの JSON 保存）を追加する際の差分判定に使えます。
- **スキーマ変更**：`db/db.ts` に `db.version(2).stores({...}).upgrade(...)` を追加します（version(1) は残す）。
  バックアップ形式を変えた場合は `db/backup.ts` の `version` を上げ、旧形式も読めるようにしてください。
