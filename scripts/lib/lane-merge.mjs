// The --merge half of check-lane-paths: merge exactly the change that was checked and
// reviewed, or nothing. `ctx` carries the check's git runner (which runs no repo hooks), its
// exit, the lane name and the reviewed change id; `result` is the check's own evaluation at
// the current lead HEAD.

function stderrOf(error) {
  const text = error && typeof error === "object" && "stderr" in error ? String(error.stderr).trim() : String(error);
  return text === "" ? "no output" : text;
}

function hasMergeHead(ctx) {
  try {
    ctx.git("rev-parse", "-q", "--verify", "MERGE_HEAD");
    return true;
  } catch (error) {
    // Exit 1 is git's "no such ref": no merge in progress. Anything else is a real failure.
    if (error && typeof error === "object" && "status" in error && error.status === 1) return false;
    throw error;
  }
}

function fail(ctx, rc, message) {
  console.log(`FAIL  lane-paths ${ctx.lane}: ${message}`);
  ctx.finish(rc);
}

// Where HEAD is, and the way back. A reset is named only while HEAD is still the checked lead
// HEAD, and as `reset --hard HEAD`, which keeps the branch where it is even if it moves
// before the operator runs it: it can only discard the tracked tree's changes.
function whereHead(ctx, result) {
  const head = ctx.git("rev-parse", "HEAD").trim();
  if (head !== result.leadHead) {
    return { moved: true, text: `HEAD is now ${head}, not the checked lead HEAD ${result.leadHead}: another writer moved the branch, so do not reset it; read git log and git status first` };
  }
  return { moved: false, text: `HEAD is still the checked lead HEAD ${result.leadHead} and the tracked tree was clean when --merge started, so return to it with: git reset --hard HEAD (from the operator's own terminal if a guard blocks it)` };
}

function mergeInProgress(ctx, result, reason) {
  try {
    return hasMergeHead(ctx);
  } catch (probeError) {
    return fail(ctx, 2, `${reason}. Checking for a merge in progress failed too (${stderrOf(probeError)}); ${whereHead(ctx, result).text}`);
  }
}

// Abort the merge if one is in progress, then say where HEAD is. "As before" is said only when
// HEAD is still the checked lead HEAD.
function abortMerge(ctx, result, rc, reason) {
  if (mergeInProgress(ctx, result, reason)) {
    try {
      ctx.git("merge", "--abort");
    } catch (abortError) {
      fail(ctx, 2, `${reason}. git could not abort the merge (${stderrOf(abortError)}); ${whereHead(ctx, result).text}`);
    }
  }
  const where = whereHead(ctx, result);
  if (where.moved) fail(ctx, 2, `${reason}. Nothing was recorded, and ${where.text}`);
  fail(ctx, rc, `${reason}; nothing was recorded and the worktree is as before`);
}

// The commit is built from the checked tree and the checked parents, not from the index, and
// the branch moves only if it still points at the checked lead HEAD (update-ref's old value),
// so neither a hook nor another writer can change what is recorded.
function commitMerge(ctx, result, sign) {
  const message = `Merge lane ${ctx.lane} at ${result.headSha} (change ${result.change})`;
  let commit = "";
  try {
    commit = ctx.git("commit-tree", ...sign, "-p", result.leadHead, "-p", result.headSha, "-m", message, result.tree).trim();
  } catch (error) {
    abortMerge(ctx, result, 2, `the commit failed (commit signing?): ${stderrOf(error)}`);
  }
  try {
    ctx.git("update-ref", "-m", `lane-paths: merge ${ctx.lane}`, "HEAD", commit, result.leadHead);
  } catch (error) {
    abortMerge(ctx, result, 2, `git update-ref refused to move the branch (it moved during the merge, or a lock is held): ${stderrOf(error)}`);
  }
  try {
    ctx.git("merge", "--quit");
  } catch (error) {
    fail(ctx, 2, `merged as ${commit}, but git merge --quit failed (${stderrOf(error)}); run git merge --quit before anything else`);
  }
  console.log(`MERGED  ${commit} (lane ${ctx.lane} at ${result.headSha}, tree ${result.tree}, parents ${result.leadHead} ${result.headSha})`);
}

// Start the merge, which writes the worktree. If git refuses to start it (an untracked file in
// the way, say), there is no MERGE_HEAD: report git's reason. A merge that started and failed
// is aborted.
function startMerge(ctx, result) {
  try {
    ctx.git("merge", "--no-ff", "--no-commit", "-s", "ort", result.headSha);
  } catch (error) {
    const reason = stderrOf(error);
    let started;
    try {
      started = hasMergeHead(ctx);
    } catch (probeError) {
      throw new Error(`git merge failed (${reason}), and checking for a merge in progress failed too (${stderrOf(probeError)})`);
    }
    if (!started) fail(ctx, 2, `git merge did not start (${reason}); no merge is in progress`);
    abortMerge(ctx, result, 1, `git merge disagreed with the check (${reason}); do not resolve it by hand`);
  }
}

// The same change, the same tree, a clean worktree on a branch, or no merge. commit-tree does
// not read commit.gpgSign, so it is read here, before anything starts, and passed on.
export function mergeReviewed(ctx, result) {
  if (result.change !== ctx.reviewedChange) {
    fail(ctx, 1, `the change this merge brings in at lead HEAD ${result.leadHead} (change ${result.change}) is not the reviewed one (${ctx.reviewedChange}); re-run the check and the review`);
  }
  if (hasMergeHead(ctx)) throw new Error("a merge is already in progress in the lead worktree; finish or abort it (git merge --abort) first");
  if (ctx.git("status", "--porcelain", "--untracked-files=no") !== "") {
    throw new Error("the lead worktree has uncommitted changes; clean it first");
  }
  if (ctx.git("rev-parse", "HEAD").trim() !== result.leadHead) throw new Error("the lead's HEAD moved during the check; run it again");
  const ref = ctx.git("rev-parse", "--symbolic-full-name", "HEAD").trim();
  if (!ref.startsWith("refs/heads/")) throw new Error(`the lead worktree is not on a branch (HEAD resolves to '${ref}', not refs/heads/...); switch to the integration branch`);
  const sign = ctx.git("config", "--type=bool", "--default=false", "commit.gpgSign").trim() === "true" ? ["-S"] : [];
  startMerge(ctx, result);
  // The commit records result.tree whatever the index holds; this keeps the worktree equal to it.
  const staged = ctx.git("write-tree").trim();
  if (staged !== result.tree) abortMerge(ctx, result, 1, `the staged merge tree ${staged} is not the checked tree ${result.tree}`);
  commitMerge(ctx, result, sign);
}
