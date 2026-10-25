"use client";

import {Fragment, type ReactNode} from "react";
import {Link} from "@/i18n/navigation";

/**
 * Renders an assistant reply. The model is allowed a tiny Markdown subset —
 * **bold**, "- " / "1. " lists and [text](href) links — and this component
 * turns exactly that into React elements. No HTML from the model is ever
 * injected, so a reply cannot add scripts or styles to the page.
 *
 * Site links are written without a locale ("/professions/x") and go through
 * the localised `Link`; external links must be http(s) and open in a new tab.
 */

type Block = {kind: "paragraph"; lines: string[]} | {kind: "list"; ordered: boolean; items: string[]};

const BULLET = /^\s*[-*•]\s+(.*)$/;
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/;

export function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  for (const raw of text.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.replace(/^\s*#{1,6}\s+/, "").trimEnd();
    const bullet = BULLET.exec(line);
    const numbered = bullet ? null : NUMBERED.exec(line);
    const last = blocks[blocks.length - 1];

    if (bullet || numbered) {
      const ordered = Boolean(numbered);
      const item = (bullet ?? numbered)![1];
      if (last?.kind === "list" && last.ordered === ordered) last.items.push(item);
      else blocks.push({kind: "list", ordered, items: [item]});
    } else if (line.trim() === "") {
      if (last && !(last.kind === "paragraph" && last.lines.length === 0)) blocks.push({kind: "paragraph", lines: []});
    } else if (last?.kind === "paragraph") {
      last.lines.push(line.trim());
    } else {
      blocks.push({kind: "paragraph", lines: [line.trim()]});
    }
  }
  return blocks.filter((block) => (block.kind === "paragraph" ? block.lines.length > 0 : block.items.length > 0));
}

const INLINE = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;

function renderInline(text: string, onInternalLink: () => void): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  for (const match of text.matchAll(INLINE)) {
    const index = match.index ?? 0;
    if (index > cursor) nodes.push(text.slice(cursor, index));
    const [, bold, label, href] = match;
    if (bold !== undefined) {
      nodes.push(<strong key={index}>{bold}</strong>);
    } else if (href.startsWith("/") && !href.startsWith("//")) {
      // The model is told not to add a locale; strip one if it does anyway.
      const path = href.replace(/^\/(ru|kk|en)(?=\/|$)/, "") || "/";
      nodes.push(
        <Link className="font-semibold text-brand underline underline-offset-2 hover:text-brand-strong" href={path} key={index} onClick={onInternalLink}>
          {label}
        </Link>
      );
    } else if (/^https?:\/\//i.test(href)) {
      nodes.push(
        <a
          className="font-semibold text-brand underline underline-offset-2 hover:text-brand-strong"
          href={href}
          key={index}
          rel="noopener noreferrer nofollow"
          target="_blank"
        >
          {label}
        </a>
      );
    } else {
      nodes.push(label);
    }
    cursor = index + match[0].length;
  }
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

export function ChatText({text, onInternalLink}: {text: string; onInternalLink: () => void}) {
  return (
    <div className="space-y-2">
      {parseBlocks(text).map((block, index) =>
        block.kind === "paragraph" ? (
          <p key={index}>
            {block.lines.map((line, lineIndex) => (
              <Fragment key={lineIndex}>
                {lineIndex > 0 ? <br /> : null}
                {renderInline(line, onInternalLink)}
              </Fragment>
            ))}
          </p>
        ) : block.ordered ? (
          <ol className="list-decimal space-y-1 pl-5" key={index}>
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex}>{renderInline(item, onInternalLink)}</li>
            ))}
          </ol>
        ) : (
          <ul className="list-disc space-y-1 pl-5" key={index}>
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex}>{renderInline(item, onInternalLink)}</li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}
