import { existsSync, mkdirSync, readdirSync, unlinkSync, statSync } from "fs";
import { join } from "path";
import { homedir } from "os";

export interface MetricsEntry {
  timestamp: number;
  metrics: Array<{ name: string; value: number }>;
}

export interface MetricsSession {
  id: string;
  startTime: number;
  endTime?: number;
  entries: MetricsEntry[];
}

const STORAGE_DIR = join(homedir(), ".ssh-command-tool", "metrics");
const MAX_SESSIONS = 50; // Keep last 50 sessions
const MAX_SESSION_SIZE = 10 * 1024 * 1024; // 10MB per session

// Ensure storage directory exists
function ensureStorageDir(): void {
  if (!existsSync(STORAGE_DIR)) {
    mkdirSync(STORAGE_DIR, { recursive: true });
  }
}

// Generate session ID from timestamp
function generateSessionId(): string {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
}

// Get session file path
function getSessionPath(sessionId: string): string {
  return join(STORAGE_DIR, `${sessionId}.json`);
}

// Current session state
let currentSession: MetricsSession | null = null;
let saveTimer: ReturnType<typeof setInterval> | null = null;

// Start a new metrics session
export function startMetricsSession(): string {
  ensureStorageDir();

  const sessionId = generateSessionId();
  currentSession = {
    id: sessionId,
    startTime: Date.now(),
    entries: [],
  };

  // Auto-save every 10 seconds
  if (saveTimer) {
    clearInterval(saveTimer);
  }
  saveTimer = setInterval(() => {
    if (currentSession) {
      saveCurrentSession();
    }
  }, 10000);

  return sessionId;
}

// Add metrics entry to current session
export function addMetricsEntry(entry: MetricsEntry): void {
  if (!currentSession) {
    startMetricsSession();
  }
  currentSession!.entries.push(entry);
}

// Save current session to disk
export function saveCurrentSession(): void {
  if (!currentSession || currentSession.entries.length === 0) {
    return;
  }

  ensureStorageDir();
  const sessionPath = getSessionPath(currentSession.id);
  const data = JSON.stringify(currentSession);

  // Check size limit
  if (data.length > MAX_SESSION_SIZE) {
    console.warn("Metrics session too large, truncating...");
    const halfEntries = Math.floor(currentSession.entries.length / 2);
    currentSession.entries = currentSession.entries.slice(halfEntries);
  }

  Bun.write(sessionPath, JSON.stringify(currentSession, null, 2));
}

// End current session
export function endMetricsSession(): MetricsSession | null {
  if (!currentSession) {
    return null;
  }

  currentSession.endTime = Date.now();
  saveCurrentSession();

  if (saveTimer) {
    clearInterval(saveTimer);
    saveTimer = null;
  }

  const session = currentSession;
  currentSession = null;

  // Cleanup old sessions
  cleanupOldSessions();

  return session;
}

// Get current session
export function getCurrentSession(): MetricsSession | null {
  return currentSession;
}

// List all saved sessions
export function listSessions(): Array<{ id: string; startTime: number; endTime?: number; entryCount: number; size: number }> {
  ensureStorageDir();

  const files = readdirSync(STORAGE_DIR).filter(f => f.endsWith(".json"));
  const sessions: Array<{ id: string; startTime: number; endTime?: number; entryCount: number; size: number }> = [];

  for (const file of files) {
    try {
      const filePath = join(STORAGE_DIR, file);
      const stat = statSync(filePath);
      const content = Bun.file(filePath).text();
      const session: MetricsSession = JSON.parse(content as unknown as string);

      sessions.push({
        id: session.id,
        startTime: session.startTime,
        endTime: session.endTime,
        entryCount: session.entries.length,
        size: stat.size,
      });
    } catch (e) {
      // Skip invalid files
    }
  }

  // Sort by start time, newest first
  sessions.sort((a, b) => b.startTime - a.startTime);

  return sessions;
}

// Load a specific session
export async function loadSession(sessionId: string): Promise<MetricsSession | null> {
  ensureStorageDir();

  const sessionPath = getSessionPath(sessionId);
  if (!existsSync(sessionPath)) {
    return null;
  }

  try {
    const content = await Bun.file(sessionPath).text();
    return JSON.parse(content);
  } catch (e) {
    return null;
  }
}

// Delete a session
export function deleteSession(sessionId: string): boolean {
  const sessionPath = getSessionPath(sessionId);
  if (existsSync(sessionPath)) {
    unlinkSync(sessionPath);
    return true;
  }
  return false;
}

// Cleanup old sessions (keep only MAX_SESSIONS)
function cleanupOldSessions(): void {
  const sessions = listSessions();

  if (sessions.length > MAX_SESSIONS) {
    const toDelete = sessions.slice(MAX_SESSIONS);
    for (const session of toDelete) {
      deleteSession(session.id);
    }
  }
}

// Export session data as JSON
export async function exportSession(sessionId: string): Promise<string | null> {
  const session = await loadSession(sessionId);
  if (!session) {
    return null;
  }
  return JSON.stringify(session, null, 2);
}
