-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_user_progress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "puzzleDate" TEXT NOT NULL,
    "answersData" TEXT NOT NULL DEFAULT '{}',
    "gridData" TEXT,
    "completedClues" TEXT NOT NULL DEFAULT '[]',
    "validatedClues" TEXT NOT NULL DEFAULT '{}',
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" DATETIME,
    "solveTime" INTEGER,
    "firstViewedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "user_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_progress_puzzleDate_fkey" FOREIGN KEY ("puzzleDate") REFERENCES "daily_puzzles" ("date") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_user_progress" ("answersData", "completedAt", "completedClues", "createdAt", "firstViewedAt", "gridData", "id", "isCompleted", "puzzleDate", "solveTime", "startedAt", "updatedAt", "userId") SELECT "answersData", "completedAt", "completedClues", "createdAt", "firstViewedAt", "gridData", "id", "isCompleted", "puzzleDate", "solveTime", "startedAt", "updatedAt", "userId" FROM "user_progress";
DROP TABLE "user_progress";
ALTER TABLE "new_user_progress" RENAME TO "user_progress";
CREATE INDEX "user_progress_puzzleDate_idx" ON "user_progress"("puzzleDate");
CREATE UNIQUE INDEX "user_progress_userId_puzzleDate_key" ON "user_progress"("userId", "puzzleDate");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
