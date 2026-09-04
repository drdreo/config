import { isAbsolute, relative, resolve, sep } from "node:path";
import type { Usage } from "@earendil-works/pi-ai";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

interface UsageTotals {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  cost: number;
}

function formatTokens(count: number): string {
  if (count < 1_000) return count.toString();
  if (count < 10_000) return `${(count / 1_000).toFixed(1)}k`;
  if (count < 1_000_000) return `${Math.round(count / 1_000)}k`;
  if (count < 10_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  return `${Math.round(count / 1_000_000)}M`;
}

function formatCwd(cwd: string, home: string | undefined): string {
  if (!home) return cwd;

  const resolvedCwd = resolve(cwd);
  const resolvedHome = resolve(home);
  const relativeToHome = relative(resolvedHome, resolvedCwd);
  const isInsideHome =
    relativeToHome === "" ||
    (relativeToHome !== ".." &&
      !relativeToHome.startsWith(`..${sep}`) &&
      !isAbsolute(relativeToHome));

  if (!isInsideHome) return cwd;
  return relativeToHome === "" ? "~" : `~${sep}${relativeToHome}`;
}

function addUsage(totals: UsageTotals, usage: Usage): void {
  totals.input += usage.input;
  totals.output += usage.output;
  totals.cacheRead += usage.cacheRead;
  totals.cacheWrite += usage.cacheWrite;
  totals.cost += usage.cost.total;
}

function sanitizeStatusText(text: string): string {
  return text
    .replace(/[\r\n\t]/g, " ")
    .replace(/ +/g, " ")
    .trim();
}

export default function thinkingFooter(pi: ExtensionAPI): void {
  let currentModel: Parameters<typeof pi.setModel>[0] | undefined;
  let currentThinking = "off";
  let requestRender: (() => void) | undefined;

  pi.on("session_start", (_event, ctx) => {
    if (ctx.mode !== "tui") return;

    currentModel = ctx.model;
    currentThinking = ctx.thinkingLevel ?? "off";

    ctx.ui.setFooter((tui, theme, footerData) => {
      const renderNow = () => tui.requestRender();
      const unsubscribeBranch = footerData.onBranchChange(renderNow);
      requestRender = renderNow;

      return {
        dispose(): void {
          unsubscribeBranch();
          if (requestRender === renderNow) requestRender = undefined;
        },
        invalidate(): void {},
        render(width: number): string[] {
          const totals: UsageTotals = {
            input: 0,
            output: 0,
            cacheRead: 0,
            cacheWrite: 0,
            cost: 0,
          };
          let latestCacheHitRate: number | undefined;

          for (const entry of ctx.sessionManager.getEntries()) {
            if (
              entry.type === "message" &&
              entry.message.role === "assistant"
            ) {
              const usage = entry.message.usage;
              addUsage(totals, usage);
              const promptTokens =
                usage.input + usage.cacheRead + usage.cacheWrite;
              latestCacheHitRate =
                promptTokens > 0
                  ? (usage.cacheRead / promptTokens) * 100
                  : undefined;
            } else if (
              entry.type === "message" &&
              entry.message.role === "toolResult" &&
              entry.message.usage
            ) {
              addUsage(totals, entry.message.usage);
            } else if (
              (entry.type === "branch_summary" ||
                entry.type === "compaction") &&
              entry.usage
            ) {
              addUsage(totals, entry.usage);
            }
          }

          let pwd = formatCwd(
            ctx.sessionManager.getCwd(),
            process.env.HOME || process.env.USERPROFILE,
          );
          const branch = footerData.getGitBranch();
          if (branch) pwd += ` (${branch})`;
          const sessionName = ctx.sessionManager.getSessionName();
          if (sessionName) pwd += ` • ${sessionName}`;

          const statsParts: string[] = [];
          if (totals.input) statsParts.push(`↑${formatTokens(totals.input)}`);
          if (totals.output) statsParts.push(`↓${formatTokens(totals.output)}`);
          if (totals.cacheRead)
            statsParts.push(`R${formatTokens(totals.cacheRead)}`);
          if (totals.cacheWrite)
            statsParts.push(`W${formatTokens(totals.cacheWrite)}`);
          if (
            (totals.cacheRead > 0 || totals.cacheWrite > 0) &&
            latestCacheHitRate !== undefined
          ) {
            statsParts.push(`CH${latestCacheHitRate.toFixed(1)}%`);
          }

          const usingSubscription =
            currentModel !== undefined &&
            (currentModel.provider === "kimi-coding" ||
              ctx.modelRegistry.isUsingOAuth(currentModel));
          if (totals.cost || usingSubscription) {
            statsParts.push(
              `$${totals.cost.toFixed(2)}${usingSubscription ? " (sub)" : ""}`,
            );
          }

          const contextUsage = ctx.getContextUsage();
          const contextWindow =
            contextUsage?.contextWindow ?? currentModel?.contextWindow ?? 0;
          const contextPercentValue = contextUsage?.percent ?? 0;
          const contextDisplay =
            contextUsage === undefined ||
            contextUsage.tokens === null ||
            contextUsage.percent === null
              ? `?/${formatTokens(contextWindow)} ?%(auto)`
              : `${formatTokens(contextUsage.tokens)}/${formatTokens(contextWindow)} ${contextPercentValue.toFixed(0)}%(auto)`;
          if (contextPercentValue > 90) {
            statsParts.push(theme.fg("error", contextDisplay));
          } else if (contextPercentValue > 70) {
            statsParts.push(theme.fg("warning", contextDisplay));
          } else {
            statsParts.push(contextDisplay);
          }

          let statsLeft = statsParts.join(" ");
          let statsLeftWidth = visibleWidth(statsLeft);
          if (statsLeftWidth > width) {
            statsLeft = truncateToWidth(statsLeft, width, "...");
            statsLeftWidth = visibleWidth(statsLeft);
          }

          const modelName = currentModel?.id ?? "no-model";
          let rightWithoutProvider = modelName;
          if (currentModel?.reasoning) {
            rightWithoutProvider =
              currentThinking === "off"
                ? `${modelName} • thinking off`
                : `${modelName} • ${currentThinking}`;
          }

          let right = rightWithoutProvider;
          const minimumPadding = 2;
          if (footerData.getAvailableProviderCount() > 1 && currentModel) {
            const withProvider = `(${currentModel.provider}) ${rightWithoutProvider}`;
            if (
              statsLeftWidth + minimumPadding + visibleWidth(withProvider) <=
              width
            ) {
              right = withProvider;
            }
          }

          const availableForRight = width - statsLeftWidth - minimumPadding;
          let visibleRight = "";
          if (availableForRight > 0) {
            visibleRight = truncateToWidth(right, availableForRight, "");
          }
          const padding = " ".repeat(
            Math.max(0, width - statsLeftWidth - visibleWidth(visibleRight)),
          );
          const thinkingColor = theme.getThinkingBorderColor(currentThinking);
          const statsLine =
            theme.fg("dim", statsLeft) + padding + thinkingColor(visibleRight);

          const lines = [
            truncateToWidth(
              theme.fg("dim", pwd),
              width,
              theme.fg("dim", "..."),
            ),
            statsLine,
          ];

          const statuses = footerData.getExtensionStatuses();
          if (statuses.size > 0) {
            const statusLine = Array.from(statuses.entries())
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([, text]) => sanitizeStatusText(text))
              .join(" ");
            lines.push(
              truncateToWidth(statusLine, width, theme.fg("dim", "...")),
            );
          }

          return lines;
        },
      };
    });
  });

  pi.on("model_select", (event) => {
    currentModel = event.model;
    requestRender?.();
  });

  pi.on("thinking_level_select", (event) => {
    currentThinking = event.level;
    requestRender?.();
  });

  pi.on("message_end", () => requestRender?.());
  pi.on("session_info_changed", () => requestRender?.());
}
