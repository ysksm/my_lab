/**
 * Expressサーバーのメインエントリーポイント
 * フロントエンドのビルド成果物を配信し、世界時計APIを提供する
 */
import express from 'express';
import path from 'path';

// Expressアプリケーションの初期化
const app = express();
// ポート番号の設定（環境変数またはデフォルト3000）
const PORT = process.env.PORT || 3000;

// フロントエンドのビルド成果物のパスを解決
// __dirnameから2階層上のweb-frontend/distディレクトリを指定
const frontendDistPath = path.join(__dirname, '../../web-frontend/dist');

// JSONリクエストボディを解析するミドルウェア
app.use(express.json());

/**
 * 時刻取得API
 * 指定されたタイムゾーンの現在時刻を返す
 * 
 * @route GET /api/time/:timezone
 * @param timezone - タイムゾーン識別子（例：Asia/Tokyo, America/New_York）
 * @returns {Object} 時刻情報
 * @returns {string} time - フォーマットされた時刻（HH:MM:SS）
 * @returns {string} timezone - リクエストされたタイムゾーン
 * @returns {string} timestamp - ISO形式のタイムスタンプ
 */
app.get('/api/time/:timezone', (req, res) => {
  try {
    // URLエンコードされたタイムゾーンパラメータをデコード
    const timezone = decodeURIComponent(req.params.timezone);
    // 現在時刻を取得
    const now = new Date();
    // 時刻フォーマットオプション（24時間形式）
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false // 24時間形式を使用
    };
    // 指定されたタイムゾーンで時刻をフォーマット
    const time = new Intl.DateTimeFormat('en-US', options).format(now);
    
    // JSON形式でレスポンスを返す
    res.json({ 
      time,
      timezone,
      timestamp: now.toISOString()
    });
  } catch (error) {
    // 無効なタイムゾーンの場合はエラーレスポンスを返す
    res.status(400).json({ error: 'Invalid timezone' });
  }
});

// フロントエンドのビルド成果物を静的ファイルとして配信
app.use(express.static(frontendDistPath));

/**
 * SPAのフォールバックルート
 * すべての未定義ルートに対してindex.htmlを返す
 * これによりクライアントサイドルーティングが機能する
 */
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

// サーバーを指定されたポートで起動
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});