import { GitCommit, ThemeColors } from '../types';

export interface LayoutOptions {
  nodeSpacingX: number;
  laneSpacingY: number;
  startX: number;
  startY: number;
}

export const DEFAULT_LAYOUT_OPTIONS: LayoutOptions = {
  nodeSpacingX: 110,
  laneSpacingY: 80,
  startX: 80,
  startY: 180,
};

export interface GitGraphBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
}

/**
 * Arranges commits chronologically from oldest (x=0) to newest,
 * assigns lanes for branches, and calculates positions & sizes.
 */
export function layoutGitCommits(
  rawCommits: GitCommit[],
  theme: ThemeColors,
  options: LayoutOptions = DEFAULT_LAYOUT_OPTIONS
): { commits: GitCommit[]; bounds: GitGraphBounds } {
  if (rawCommits.length === 0) {
    return {
      commits: [],
      bounds: { minX: 0, maxX: 500, minY: 0, maxY: 300, width: 500, height: 300 },
    };
  }

  // Sort chronological (oldest first)
  const sorted = [...rawCommits].sort(
    (a, b) => new Date(a.author.date).getTime() - new Date(b.author.date).getTime()
  );

  // Dynamic adaptive spacing so large repositories stay compact and never explode in size
  const total = sorted.length;
  const adaptiveSpacingX =
    total > 5000 ? 14 : total > 2000 ? 20 : total > 800 ? 32 : total > 250 ? 52 : total > 80 ? 76 : 100;
  const effectiveSpacingX =
    options.nodeSpacingX !== DEFAULT_LAYOUT_OPTIONS.nodeSpacingX
      ? options.nodeSpacingX
      : adaptiveSpacingX;
  const effectiveSpacingY = Math.min(options.laneSpacingY, 72);

  const shaToCommit = new Map<string, GitCommit>();
  const activeLanes = new Map<number, { sha: string; index: number }>(); // laneIndex -> last commit info
  const MAX_BRANCH_LANES = 5; // Lane 0 is main; lanes 1..5 for parallel branches

  const positionedCommits: GitCommit[] = [];

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  sorted.forEach((commit, index) => {
    let assignedLane = 0; // default to main branch (lane 0)

    // Clean up stale inactive branches (idle for 50+ commits) to free lanes for new active branches
    activeLanes.forEach((info, lane) => {
      if (lane > 0 && index - info.index > 50) {
        activeLanes.delete(lane);
      }
    });

    if (commit.parents && commit.parents.length > 0) {
      const primaryParentSha = commit.parents[0];
      const primaryParent = shaToCommit.get(primaryParentSha);

      if (primaryParent) {
        // If primary parent's lane is still occupied by it, continue on that lane
        const laneInfo = activeLanes.get(primaryParent.lane);
        if (laneInfo && laneInfo.sha === primaryParentSha) {
          assignedLane = primaryParent.lane;
        } else {
          // Fork divergence: find first free branch lane between 1 and MAX_BRANCH_LANES
          let candidate = 1;
          while (activeLanes.has(candidate) && candidate < MAX_BRANCH_LANES) {
            candidate++;
          }
          assignedLane = candidate;
        }
      } else {
        assignedLane = 0;
      }
    } else {
      assignedLane = 0;
    }

    // Update active lane tracker
    activeLanes.set(assignedLane, { sha: commit.sha, index });

    // If this commit is a merge commit (has 2+ parents), free merged lanes
    const isMerge = commit.parents.length > 1;
    if (isMerge) {
      for (let p = 1; p < commit.parents.length; p++) {
        const secParent = shaToCommit.get(commit.parents[p]);
        if (secParent && secParent.lane !== assignedLane) {
          const secLaneInfo = activeLanes.get(secParent.lane);
          if (secLaneInfo && secLaneInfo.sha === secParent.sha) {
            activeLanes.delete(secParent.lane);
          }
        }
      }
    }

    // Calculate node size based on code churn (additions + deletions)
    const codeChurn = commit.stats
      ? commit.stats.additions + commit.stats.deletions
      : (commit.filesChanged || 1) * 20;

    // Radius scale: min 8px, max 22px
    const radius = Math.min(22, Math.max(8, 8 + Math.log2(Math.max(1, codeChurn)) * 1.8));

    // Determine color based on lane
    const color =
      assignedLane === 0
        ? theme.mainLaneColor
        : theme.branchColors[(assignedLane - 1) % theme.branchColors.length];

    // Compute coordinates
    const x = options.startX + index * effectiveSpacingX;
    const y = options.startY + assignedLane * effectiveSpacingY;

    const positioned: GitCommit = {
      ...commit,
      lane: assignedLane,
      x,
      y,
      radius,
      color,
      isMerge,
    };

    minX = Math.min(minX, x - radius - 20);
    maxX = Math.max(maxX, x + radius + 20);
    minY = Math.min(minY, y - radius - 40);
    maxY = Math.max(maxY, y + radius + 40);

    shaToCommit.set(commit.sha, positioned);
    positionedCommits.push(positioned);
  });

  return {
    commits: positionedCommits,
    bounds: {
      minX,
      maxX,
      minY,
      maxY,
      width: Math.max(600, maxX - minX),
      height: Math.max(400, maxY - minY),
    },
  };
}
