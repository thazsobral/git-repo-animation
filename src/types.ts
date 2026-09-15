export interface GitCommit {
  sha: string;
  shortSha: string;
  message: string;
  author: {
    name: string;
    email?: string;
    date: string;
    avatarUrl?: string;
  };
  parents: string[];
  isMerge: boolean;
  branchName?: string;
  stats?: {
    additions: number;
    deletions: number;
    total: number;
  };
  filesChanged?: number;
  // Layout computed properties
  x: number;
  y: number;
  lane: number;
  radius: number;
  color: string;
}

export interface GitBranch {
  name: string;
  color: string;
  lane: number;
}

export interface RepoMetadata {
  owner: string;
  name: string;
  fullName: string;
  description: string;
  stars: number;
  forks: number;
  defaultBranch: string;
  totalCommits: number;
  isMock?: boolean;
}

export type TimelineViewMode = 'follow' | 'overview';

export type VisualTheme = 'cosmic' | 'neon' | 'minimal-dark' | 'solar';

export interface ThemeColors {
  name: string;
  bg: string;
  bgSecondary: string;
  gridColor: string;
  mainLaneColor: string;
  branchColors: string[];
  textColor: string;
  textMuted: string;
  nodeGlow: string;
  mergeGlow: string;
  pulseColor: string;
  starfield: boolean;
}

export interface ExportProgress {
  status: 'idle' | 'rendering' | 'encoding' | 'completed' | 'error';
  progress: number; // 0 to 100
  currentFrame: number;
  totalFrames: number;
  downloadUrl?: string;
  fileBlob?: Blob;
  fileName?: string;
  fileSizeText?: string;
  errorMessage?: string;
}
