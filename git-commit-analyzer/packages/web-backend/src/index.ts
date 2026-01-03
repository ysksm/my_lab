import { resolve } from "path";
import {
  DuckDBCommitRepository,
  SimpleGitRepository,
  ImportCommitsUseCase,
  AnalyzeCommitsUseCase,
} from "../../core/src";

const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || "git_commits.duckdb";

const commitRepository = new DuckDBCommitRepository(DB_PATH);
let analyzeUseCase: AnalyzeCommitsUseCase;

async function initDatabase() {
  await commitRepository.init();
  analyzeUseCase = new AnalyzeCommitsUseCase(commitRepository);
  console.log(`Database initialized: ${DB_PATH}`);
}

function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders(),
  });
}

function errorResponse(message: string, status = 500): Response {
  return jsonResponse({ error: message }, status);
}

async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;

  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders() });
  }

  try {
    // API Routes
    if (path === "/api/stats") {
      const stats = await analyzeUseCase.getDatabaseStats();
      return jsonResponse(stats);
    }

    if (path === "/api/hotspots") {
      const limit = parseInt(url.searchParams.get("limit") || "20");
      const results = await analyzeUseCase.getHotspots(limit);
      return jsonResponse(results);
    }

    if (path === "/api/bugfixes") {
      const limit = parseInt(url.searchParams.get("limit") || "30");
      const results = await analyzeUseCase.findBugFixCommits(limit);
      return jsonResponse(results);
    }

    if (path === "/api/history") {
      const filePath = url.searchParams.get("file");
      if (!filePath) {
        return errorResponse("Missing 'file' parameter", 400);
      }
      const limit = parseInt(url.searchParams.get("limit") || "50");
      const results = await analyzeUseCase.getFileHistory(filePath, limit);
      return jsonResponse(results);
    }

    if (path === "/api/coupled") {
      const minCoupling = parseInt(url.searchParams.get("min") || "3");
      const limit = parseInt(url.searchParams.get("limit") || "30");
      const results = await analyzeUseCase.getCoupledFiles(minCoupling, limit);
      return jsonResponse(results);
    }

    if (path === "/api/authors") {
      const results = await analyzeUseCase.getAuthorStats();
      return jsonResponse(results);
    }

    if (path === "/api/churn") {
      const minChurn = parseInt(url.searchParams.get("min") || "100");
      const limit = parseInt(url.searchParams.get("limit") || "20");
      const results = await analyzeUseCase.getHighChurnFiles(minChurn, limit);
      return jsonResponse(results);
    }

    if (path === "/api/risk") {
      const limit = parseInt(url.searchParams.get("limit") || "20");
      const results = await analyzeUseCase.getBugPredictionScores(limit);
      return jsonResponse(results);
    }

    if (path === "/api/commit") {
      const hash = url.searchParams.get("hash");
      if (!hash) {
        return errorResponse("Missing 'hash' parameter", 400);
      }
      const result = await analyzeUseCase.getCommitDetails(hash);
      if (!result) {
        return errorResponse("Commit not found", 404);
      }
      return jsonResponse({
        commit: {
          hash: result.commit.hash,
          authorName: result.commit.authorName,
          authorEmail: result.commit.authorEmail,
          date: result.commit.date.toISOString(),
          message: result.commit.message,
          isMerge: result.commit.isMerge,
        },
        files: result.files.map((f) => ({
          filePath: f.filePath,
          changeType: f.changeType,
          insertions: f.insertions,
          deletions: f.deletions,
        })),
      });
    }

    if (path === "/api/import" && req.method === "POST") {
      const body = await req.json();
      const repoPath = body.path || ".";
      const absolutePath = resolve(repoPath);

      const gitRepository = new SimpleGitRepository(absolutePath);
      const importUseCase = new ImportCommitsUseCase(commitRepository, gitRepository);

      const result = await importUseCase.execute();
      return jsonResponse({
        repoName: result.repoName,
        importedCount: result.importedCount,
        totalCount: result.totalCount,
      });
    }

    if (path === "/api/query" && req.method === "POST") {
      const body = await req.json();
      const sql = body.sql;
      if (!sql) {
        return errorResponse("Missing 'sql' in request body", 400);
      }
      const results = await analyzeUseCase.executeCustomQuery(sql);
      return jsonResponse(results);
    }

    // Health check
    if (path === "/health") {
      return jsonResponse({ status: "ok" });
    }

    return errorResponse("Not found", 404);
  } catch (error) {
    console.error("Request error:", error);
    return errorResponse(error instanceof Error ? error.message : "Internal server error");
  }
}

async function main() {
  await initDatabase();

  const server = Bun.serve({
    port: PORT,
    fetch: handleRequest,
  });

  console.log(`Git Commit Analyzer API server running at http://localhost:${server.port}`);
  console.log("\nAvailable endpoints:");
  console.log("  GET  /api/stats              - Database statistics");
  console.log("  GET  /api/hotspots           - Frequently changed files");
  console.log("  GET  /api/bugfixes           - Bug fix commits");
  console.log("  GET  /api/history?file=PATH  - File change history");
  console.log("  GET  /api/coupled            - Coupled files");
  console.log("  GET  /api/authors            - Author statistics");
  console.log("  GET  /api/churn              - High churn files");
  console.log("  GET  /api/risk               - Bug risk prediction");
  console.log("  GET  /api/commit?hash=HASH   - Commit details");
  console.log("  POST /api/import             - Import repository");
  console.log("  POST /api/query              - Execute SQL query");
}

main().catch(console.error);
