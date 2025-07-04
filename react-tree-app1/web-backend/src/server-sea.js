/**
 * Node.js SEA (Single Executable Application) 用のサーバー
 * フロントエンドのビルド成果物を実行ファイルに埋め込み、
 * 単一の実行可能ファイルとして配布可能にする
 */
const express = require('express');
const path = require('path');
const fs = require('fs');

// Expressアプリケーションの初期化
const app = express();
// ポート番号の設定（環境変数またはデフォルト3000）
const PORT = process.env.PORT || 3000;

/**
 * SEA用にフロントエンドファイルを埋め込むためのオブジェクト
 * キー: ファイルパス、値: ファイル内容とMIMEタイプ
 */
const FRONTEND_FILES = {};

/**
 * ビルド時にフロントエンドファイルを読み込んでメモリに保持する関数
 * これにより、実行時にファイルシステムへのアクセスが不要になる
 */
function loadFrontendFiles() {
  // フロントエンドのビルド成果物のパスを解決
  const distPath = path.join(__dirname, '../../web-frontend/dist');
  
  // index.htmlを読み込む（SPAのエントリーポイント）
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    FRONTEND_FILES['/index.html'] = {
      content: fs.readFileSync(indexPath, 'utf-8'),
      type: 'text/html'
    };
  }
  
  // assetsディレクトリのファイルを読み込む（JS、CSSファイル）
  const assetsPath = path.join(distPath, 'assets');
  if (fs.existsSync(assetsPath)) {
    const files = fs.readdirSync(assetsPath);
    files.forEach(file => {
      const filePath = path.join(assetsPath, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      // ファイル拡張子に基づいてMIMEタイプを設定
      const type = file.endsWith('.css') ? 'text/css' : 'application/javascript';
      FRONTEND_FILES[`/assets/${file}`] = { content, type };
    });
  }
}

// アプリケーション起動時にフロントエンドファイルを読み込む
loadFrontendFiles();

// JSONリクエストボディを解析するミドルウェア
app.use(express.json());

/**
 * 世界時計データ取得API
 * @route GET /api/world-clock
 */
app.get('/api/world-clock', (req, res) => {
  const worldClockData = {
    id: 'world',
    name: 'World',
    areas: [
      {
        id: 'asia',
        name: 'Asia',
        rootId: 'world',
        countries: [
          {
            id: 'japan',
            name: 'Japan',
            areaId: 'asia',
            cities: [
              { id: 'tokyo', name: 'Tokyo', timezone: 'Asia/Tokyo', countryId: 'japan' },
              { id: 'osaka', name: 'Osaka', timezone: 'Asia/Tokyo', countryId: 'japan' }
            ]
          },
          {
            id: 'china',
            name: 'China',
            areaId: 'asia',
            cities: [
              { id: 'beijing', name: 'Beijing', timezone: 'Asia/Shanghai', countryId: 'china' },
              { id: 'shanghai', name: 'Shanghai', timezone: 'Asia/Shanghai', countryId: 'china' }
            ]
          }
        ]
      },
      {
        id: 'europe',
        name: 'Europe',
        rootId: 'world',
        countries: [
          {
            id: 'uk',
            name: 'United Kingdom',
            areaId: 'europe',
            cities: [
              { id: 'london', name: 'London', timezone: 'Europe/London', countryId: 'uk' }
            ]
          },
          {
            id: 'france',
            name: 'France',
            areaId: 'europe',
            cities: [
              { id: 'paris', name: 'Paris', timezone: 'Europe/Paris', countryId: 'france' }
            ]
          }
        ]
      },
      {
        id: 'america',
        name: 'America',
        rootId: 'world',
        countries: [
          {
            id: 'usa',
            name: 'United States',
            areaId: 'america',
            cities: [
              { id: 'newyork', name: 'New York', timezone: 'America/New_York', countryId: 'usa' },
              { id: 'losangeles', name: 'Los Angeles', timezone: 'America/Los_Angeles', countryId: 'usa' }
            ]
          }
        ]
      }
    ]
  };
  
  res.json(worldClockData);
});

/**
 * 複数都市の時刻一括取得API
 * @route POST /api/times
 */
app.post('/api/times', (req, res) => {
  try {
    const { timezones } = req.body;
    
    if (!Array.isArray(timezones)) {
      return res.status(400).json({ error: 'Invalid request: timezones must be an array' });
    }
    
    const now = new Date();
    const timeData = {};
    
    for (const timezone of timezones) {
      try {
        const options = {
          timeZone: timezone,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        };
        const time = new Intl.DateTimeFormat('en-US', options).format(now);
        
        timeData[timezone] = {
          time,
          timezone,
          timestamp: now.toISOString()
        };
      } catch (error) {
        timeData[timezone] = {
          time: 'Invalid timezone',
          timezone,
          timestamp: now.toISOString()
        };
      }
    }
    
    res.json(timeData);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

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
    const options = {
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

/**
 * 埋め込まれたファイルを提供するルートハンドラ
 * メモリ内のFRONTEND_FILESオブジェクトからファイルを配信する
 */
app.get('*', (req, res) => {
  // ルートパスの場合はindex.htmlを返す
  const requestPath = req.path === '/' ? '/index.html' : req.path;
  const file = FRONTEND_FILES[requestPath];
  
  if (file) {
    // ファイルが存在する場合は適切なMIMEタイプで返す
    res.type(file.type);
    res.send(file.content);
  } else {
    // ファイルが存在しない場合はSPAルーティング用のフォールバック
    // どのパスでもindex.htmlを返すことで、クライアントサイドルーティングを有効にする
    const indexFile = FRONTEND_FILES['/index.html'];
    if (indexFile) {
      res.type(indexFile.type);
      res.send(indexFile.content);
    } else {
      // index.htmlも存在しない場合は404エラー
      res.status(404).send('Not Found');
    }
  }
});

// サーバーを指定されたポートで起動
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Serving ${Object.keys(FRONTEND_FILES).length} embedded files`);
});