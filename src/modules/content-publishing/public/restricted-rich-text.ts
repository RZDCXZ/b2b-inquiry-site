export type RestrictedRichTextInline =
  | { kind: "text"; text: string }
  | { children: RestrictedRichTextInline[]; kind: "emphasis" }
  | { children: RestrictedRichTextInline[]; kind: "strong" }
  | { children: RestrictedRichTextInline[]; href: string; kind: "link" };

export type RestrictedRichTextBlock =
  | {
      children: RestrictedRichTextInline[];
      kind: "heading";
      level: 2 | 3;
    }
  | { children: RestrictedRichTextInline[]; kind: "paragraph" }
  | {
      items: RestrictedRichTextInline[][];
      kind: "list";
      ordered: boolean;
    }
  | { alt: string; kind: "image"; src: string };

export type RestrictedRichTextValidation =
  { success: true } | { issues: string[]; success: false };

const imageLinePattern = /^!\[([^\]]+)\]\(([^)]+)\)$/u;
const linkPattern = /!?\[[^\]]*\]\(([^)]*)\)/gu;

function isAllowedLinkTarget(target: string): boolean {
  if (target.startsWith("/") && !target.startsWith("//")) {
    return !target.includes("..") && !/[\u0000-\u001f]/u.test(target);
  }

  try {
    const url = new URL(target);
    return ["http:", "https:", "mailto:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function isAllowedImageSource(source: string): boolean {
  return (
    (/^\/assets\/[a-zA-Z0-9][a-zA-Z0-9._/-]*$/u.test(source) ||
      /^\/media\/assets\/[a-zA-Z0-9_-]+$/u.test(source)) &&
    !source.includes("..")
  );
}

export function validateRestrictedRichText(
  source: string,
): RestrictedRichTextValidation {
  const issues: string[] = [];

  if (source.length > 50_000) {
    issues.push("富文本内容不能超过 50000 个字符。");
  }

  if (/[<>]/u.test(source)) {
    issues.push("富文本不接受 HTML 标签、脚本、iframe 或内嵌样式。");
  }

  for (const match of source.matchAll(linkPattern)) {
    const target = match[1].trim();
    const isImage = match[0].startsWith("!");
    if (
      isImage ? !isAllowedImageSource(target) : !isAllowedLinkTarget(target)
    ) {
      issues.push(
        isImage
          ? "图片必须使用本站素材路径。"
          : "链接只允许本站路径、http、https 或 mailto 地址。",
      );
    }
  }

  for (const rawLine of source.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (line.startsWith("![") && !imageLinePattern.test(line)) {
      issues.push("图片必须单独成行并包含替代文本与本站素材路径。");
    }
    if (/^#{1,6}\s/u.test(line) && !/^#{2,3}\s+\S/u.test(line)) {
      issues.push("标题只允许二级或三级标题。");
    }
  }

  return issues.length === 0
    ? { success: true }
    : { issues: [...new Set(issues)], success: false };
}

function parseInline(source: string): RestrictedRichTextInline[] {
  const nodes: RestrictedRichTextInline[] = [];
  const tokenPattern =
    /(\*\*([^*\n]+)\*\*|\*([^*\n]+)\*|\[([^\]\n]+)\]\(([^)\n]+)\))/gu;
  let cursor = 0;

  for (const match of source.matchAll(tokenPattern)) {
    const index = match.index;
    if (index > cursor) {
      nodes.push({ kind: "text", text: source.slice(cursor, index) });
    }

    if (match[2] !== undefined) {
      nodes.push({
        children: [{ kind: "text", text: match[2] }],
        kind: "strong",
      });
    } else if (match[3] !== undefined) {
      nodes.push({
        children: [{ kind: "text", text: match[3] }],
        kind: "emphasis",
      });
    } else {
      nodes.push({
        children: [{ kind: "text", text: match[4] }],
        href: match[5].trim(),
        kind: "link",
      });
    }
    cursor = index + match[0].length;
  }

  if (cursor < source.length) {
    nodes.push({ kind: "text", text: source.slice(cursor) });
  }

  return nodes.length > 0 ? nodes : [{ kind: "text", text: "" }];
}

export function parseRestrictedRichText(
  source: string,
): RestrictedRichTextBlock[] {
  const validation = validateRestrictedRichText(source);
  if (!validation.success) {
    throw new Error(validation.issues.join(" "));
  }

  const lines = source.split(/\r?\n/u);
  const blocks: RestrictedRichTextBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line) {
      index += 1;
      continue;
    }

    const heading = /^(#{2,3})\s+(.+)$/u.exec(line);
    if (heading) {
      blocks.push({
        children: parseInline(heading[2]),
        kind: "heading",
        level: heading[1].length as 2 | 3,
      });
      index += 1;
      continue;
    }

    const image = imageLinePattern.exec(line);
    if (image) {
      blocks.push({ alt: image[1], kind: "image", src: image[2].trim() });
      index += 1;
      continue;
    }

    const listItem = /^(?:(-)\s+|(\d+)\.\s+)(.+)$/u.exec(line);
    if (listItem) {
      const ordered = listItem[2] !== undefined;
      const items: RestrictedRichTextInline[][] = [];
      while (index < lines.length) {
        const candidate = /^(?:(-)\s+|(\d+)\.\s+)(.+)$/u.exec(
          lines[index].trim(),
        );
        if (!candidate || (candidate[2] !== undefined) !== ordered) {
          break;
        }
        items.push(parseInline(candidate[3]));
        index += 1;
      }
      blocks.push({ items, kind: "list", ordered });
      continue;
    }

    const paragraphLines = [line];
    index += 1;
    while (index < lines.length) {
      const candidate = lines[index].trim();
      if (!candidate || /^(?:#{2,3}\s+|!\[|(?:-|\d+\.)\s+)/u.test(candidate)) {
        break;
      }
      paragraphLines.push(candidate);
      index += 1;
    }
    blocks.push({
      children: parseInline(paragraphLines.join(" ")),
      kind: "paragraph",
    });
  }

  return blocks;
}
