import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const SECTIONS = ["Highlights", "Improvements", "Fixes"] as const;
const DEFAULT_MODEL = "gpt-5.6-sol";
const MAX_DIFF_CHARS = 24_000;
const TAG_PREFIX = "knowcards-v";
const RELEASE_PLEASE_TITLE = /^chore(?:\([^)]+\))?: release(?:\s|$)/;

type Section = (typeof SECTIONS)[number];

interface PullRequest {
  number: number;
  title: string;
  body: string | null;
  author: string | null;
  labels: string[];
  files: string[];
  diff: string;
  url: string;
}

interface ReleaseContext {
  tag: string;
  previousTag: string;
  pullRequests: PullRequest[];
}

function execGh(args: readonly string[]): string {
  return execFileSync("gh", [...args], {
    encoding: "utf8",
    timeout: 300_000,
    maxBuffer: 10 * 1024 * 1024,
  });
}

function ghJson<T>(args: readonly string[]): T {
  return JSON.parse(execGh(args)) as T;
}

function releaseVersionFromTag(tag: string): string {
  const value = tag.trim();
  if (value.startsWith(TAG_PREFIX)) return value.slice(TAG_PREFIX.length);
  if (value.startsWith("v")) return value.slice(1);
  return value;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractPullRequestNumber(message: string): number | null {
  const firstLine = message.split(/\r?\n/, 1)[0] ?? message;
  const squash = firstLine.match(/\(#(?<number>\d+)\)\s*$/);
  if (squash?.groups?.number) return Number(squash.groups.number);
  const merge = firstLine.match(/^Merge pull request #(?<number>\d+) /);
  if (merge?.groups?.number) return Number(merge.groups.number);
  return null;
}

function truncateDiff(diff: string): string {
  const trimmed = diff.trim();
  if (trimmed.length <= MAX_DIFF_CHARS) return trimmed;
  return `${trimmed.slice(0, MAX_DIFF_CHARS).trimEnd()}\n[diff truncated]`;
}

function formatNotesForChangelog(notes: string): string {
  const lines = notes.trim().split(/\r?\n/);
  if (lines[0]?.startsWith("# ")) {
    lines[0] = `_${lines[0].replace(/^#\s+/, "").trim()}_`;
  }
  return lines.join("\n").replace(/^##\s+/gm, "### ");
}

export function replaceChangelogReleaseNotes(
  changelog: string,
  tag: string,
  notes: string,
): string {
  const version = releaseVersionFromTag(tag);
  const headingPattern = new RegExp(
    `^## \\[${escapeRegExp(version)}\\]\\([^\\n]+\\) \\([^\\n]+\\)\\s*$`,
    "m",
  );
  const headingMatch = headingPattern.exec(changelog);
  if (!headingMatch) {
    throw new Error(`Could not find CHANGELOG.md entry for ${version}`);
  }

  const headingEnd = headingMatch.index + headingMatch[0].length;
  const remaining = changelog.slice(headingEnd);
  const nextReleaseMatch = /\n## \[/.exec(remaining);
  const releaseEnd = nextReleaseMatch
    ? headingEnd + nextReleaseMatch.index
    : changelog.length;
  const before = changelog.slice(0, headingEnd).trimEnd();
  const after = changelog.slice(releaseEnd);
  const suffix = after ? after.replace(/^\n+/, "\n\n") : "\n";

  return `${before}\n\n${formatNotesForChangelog(notes)}${suffix}`;
}

function repository(env: NodeJS.ProcessEnv): string {
  const fromEnv = env.GITHUB_REPOSITORY?.trim();
  if (fromEnv) return fromEnv;
  const fallback = execGh([
    "repo",
    "view",
    "--json",
    "nameWithOwner",
    "--jq",
    ".nameWithOwner",
  ]).trim();
  if (!fallback) throw new Error("Unable to determine GitHub repository");
  return fallback;
}

function previousTag(repo: string, tag: string): string {
  const releases = ghJson<Array<{ tag_name: string }>>([
    "api",
    `repos/${repo}/releases?per_page=100`,
  ]);
  const currentIndex = releases.findIndex(
    (release) => release.tag_name === tag,
  );
  if (currentIndex === -1) {
    throw new Error(`Could not find GitHub release for tag ${tag}`);
  }
  const previous = releases
    .slice(currentIndex + 1)
    .find((release) => release.tag_name !== tag)?.tag_name;
  if (!previous) {
    throw new Error(`Could not determine previous release tag for ${tag}`);
  }
  return previous;
}

function loadPullRequest(repo: string, number: number): PullRequest {
  const details = ghJson<{
    number: number;
    title: string;
    body?: string | null;
    user?: { login?: string } | null;
    labels?: Array<{ name?: string }>;
    html_url: string;
  }>(["api", `repos/${repo}/pulls/${number}`]);
  const files = ghJson<Array<{ filename: string }>>([
    "api",
    `repos/${repo}/pulls/${number}/files?per_page=100`,
  ]);
  let diff = "";
  try {
    diff = truncateDiff(execGh(["pr", "diff", String(number), "--repo", repo]));
  } catch {
    diff = "";
  }

  return {
    number: details.number,
    title: details.title,
    body: details.body ?? null,
    author: details.user?.login ?? null,
    labels: (details.labels ?? []).flatMap((label) =>
      label.name ? [label.name] : [],
    ),
    files: files.map((file) => file.filename),
    diff,
    url: details.html_url,
  };
}

function loadContext(tag: string, env: NodeJS.ProcessEnv): ReleaseContext {
  const normalized = tag.trim();
  if (!normalized) throw new Error("Release tag is empty");
  const repo = repository(env);
  const previous = previousTag(repo, normalized);
  const compare = ghJson<{
    commits: Array<{ commit?: { message?: string } }>;
  }>(["api", `repos/${repo}/compare/${previous}...${normalized}`]);
  const numbers = [
    ...new Set(
      compare.commits
        .map((commit) => extractPullRequestNumber(commit.commit?.message ?? ""))
        .filter((value): value is number => value !== null),
    ),
  ];
  const pullRequests = numbers
    .map((number) => loadPullRequest(repo, number))
    .filter((pr) => {
      const title = pr.title.trim().toLowerCase();
      if (title.startsWith("release:")) return false;
      if (RELEASE_PLEASE_TITLE.test(title)) return false;
      return !pr.labels.some((label) => {
        const name = label.trim().toLowerCase();
        return name === "release" || name === "skip-changelog";
      });
    });

  return { tag: normalized, previousTag: previous, pullRequests };
}

function buildPrompt(context: ReleaseContext): string {
  const summaries = context.pullRequests
    .map((pr) => {
      const files = pr.files.length > 0 ? pr.files.join("\n") : "None";
      const body = pr.body?.trim() ? pr.body.trim() : "None";
      const diff = pr.diff.trim() ? pr.diff : "None";
      return [
        `PR #${pr.number}: ${pr.title}`,
        `Author: @${pr.author ?? "unknown"}`,
        `Labels: ${pr.labels.length > 0 ? pr.labels.join(", ") : "None"}`,
        `Files:\n${files}`,
        `Body:\n${body}`,
        `Diff:\n${diff}`,
      ].join("\n");
    })
    .join("\n\n");

  return [
    `Write user-facing release notes for ${context.tag}.`,
    `Release range: ${context.previousTag}...${context.tag}.`,
    "Use only the supplied pull requests below. Do not invent changes.",
    `Allowed sections: ${SECTIONS.map((section) => `## ${section}`).join(", ")}.`,
    "Do not include a top-level release title.",
    "Include only sections that have user-visible changes. Omit empty sections.",
    "Do not write placeholder text such as None or N/A.",
    "This product is knowcards: filesystem knowledge cards, CLI, MCP, and host adapters (Claude Code, Cursor, Codex).",
    "Use ## Highlights for the most important user-visible changes.",
    "Use ## Improvements for other product, CLI, docs, or workflow changes.",
    "Use ## Fixes for bug fixes.",
    "",
    "Pull requests included for this release:",
    summaries,
  ].join("\n");
}

function parseSections(raw: string): Partial<Record<Section, string[]>> {
  const sections: Partial<Record<Section, string[]>> = {};
  let current: Section | null = null;
  for (const line of raw.split(/\r?\n/)) {
    const heading = line.match(/^##\s+(.+?)\s*$/);
    if (heading) {
      const name = SECTIONS.find(
        (candidate) => candidate.toLowerCase() === heading[1]?.toLowerCase(),
      );
      current = name ?? null;
      if (current) sections[current] ??= [];
      continue;
    }
    if (current) {
      sections[current] ??= [];
      sections[current]?.push(line);
    }
  }
  return sections;
}

function isEmptySection(content: string): boolean {
  const lines = content
    .split(/\r?\n/)
    .map((line) =>
      line
        .trim()
        .replace(/^[-*]\s+/, "")
        .replace(/[.。]+$/, "")
        .trim()
        .toLowerCase(),
    )
    .filter(Boolean);
  if (lines.length === 0) return true;
  return lines.every(
    (line) =>
      line === "none" ||
      line === "n/a" ||
      /^no .*?(?:changes|updates|fixes|improvements|highlights)/.test(line),
  );
}

function normalizeNotes(raw: string): string {
  const parsed = parseSections(raw);
  const blocks = SECTIONS.flatMap((section) => {
    const content = parsed[section]?.join("\n").trim();
    if (!content || isEmptySection(content)) return [];
    return [`## ${section}\n${content}`];
  });
  return blocks.join("\n\n");
}

async function generateOpenAINotes(
  prompt: string,
  model: string,
  apiKey: string,
): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 600);
    throw new Error(
      `OpenAI request failed with HTTP ${response.status}: ${detail}`,
    );
  }
  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("OpenAI returned empty content");
  return text;
}

function updateChangelog(
  tag: string | undefined,
  notesPath: string | undefined,
  changelogPath = "CHANGELOG.md",
): number {
  if (!tag || !notesPath) {
    process.stderr.write(
      "Usage: generate-release-notes --update-changelog <tag> <notes-file> [changelog-file]\n",
    );
    return 1;
  }
  try {
    const notes = readFileSync(notesPath, "utf8");
    const changelog = readFileSync(changelogPath, "utf8");
    const updated = replaceChangelogReleaseNotes(changelog, tag, notes);
    if (updated !== changelog) writeFileSync(changelogPath, updated);
    process.stdout.write(`Updated ${changelogPath} for ${tag}\n`);
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`CHANGELOG.md update failed: ${message}\n`);
    return 1;
  }
}

export async function runGenerateReleaseNotes(
  argv: string[] = process.argv,
  env: NodeJS.ProcessEnv = process.env,
): Promise<number> {
  if (argv[2] === "--update-changelog") {
    return updateChangelog(argv[3], argv[4], argv[5]);
  }

  const tag = argv[2];
  if (!tag) {
    process.stderr.write("Usage: generate-release-notes <tag>\n");
    return 1;
  }
  const apiKey = env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    process.stderr.write(
      "OPENAI_API_KEY is required to generate release notes.\n",
    );
    return 1;
  }

  try {
    const context = loadContext(tag, env);
    const model = env.OPENAI_RELEASE_NOTES_MODEL || DEFAULT_MODEL;
    const raw = await generateOpenAINotes(buildPrompt(context), model, apiKey);
    const normalized = normalizeNotes(raw);
    if (!normalized)
      throw new Error("OpenAI returned no usable release notes.");
    process.stdout.write(`${normalized}\n`);
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`OpenAI release notes failed: ${message}\n`);
    return 1;
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  process.exit(await runGenerateReleaseNotes());
}
