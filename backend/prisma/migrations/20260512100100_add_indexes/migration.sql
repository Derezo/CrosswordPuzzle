-- Hot-path indexes.
-- user_progress.puzzleDate: leaderboards and per-date completion counts.
-- achievements.conditionType: switch dispatch in achievementService.checkAchievementCondition.
-- suggestions.status: admin filter on the /api/suggestion/all endpoint.
CREATE INDEX "user_progress_puzzleDate_idx" ON "user_progress"("puzzleDate");
CREATE INDEX "achievements_conditionType_idx" ON "achievements"("conditionType");
CREATE INDEX "suggestions_status_idx" ON "suggestions"("status");
