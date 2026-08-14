import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import {
  parseRestrictedRichText,
  type RestrictedRichTextInline,
} from "@/src/modules/content-publishing/public/restricted-rich-text";

function InlineContent({ nodes }: { nodes: RestrictedRichTextInline[] }) {
  return nodes.map((node, index): ReactNode => {
    const key = `${node.kind}-${index}`;
    if (node.kind === "text") return node.text;
    if (node.kind === "strong") {
      return (
        <strong key={key}>
          <InlineContent nodes={node.children} />
        </strong>
      );
    }
    if (node.kind === "emphasis") {
      return (
        <em key={key}>
          <InlineContent nodes={node.children} />
        </em>
      );
    }
    return node.href.startsWith("/") ? (
      <Link href={node.href} key={key}>
        <InlineContent nodes={node.children} />
      </Link>
    ) : (
      <a href={node.href} key={key} rel="noreferrer">
        <InlineContent nodes={node.children} />
      </a>
    );
  });
}

export function RestrictedRichText({
  className,
  source,
}: {
  className?: string;
  source: string;
}) {
  const blocks = parseRestrictedRichText(source);
  return (
    <div className={className}>
      {blocks.map((block, index) => {
        const key = `${block.kind}-${index}`;
        if (block.kind === "heading") {
          return block.level === 2 ? (
            <h2 key={key}>
              <InlineContent nodes={block.children} />
            </h2>
          ) : (
            <h3 key={key}>
              <InlineContent nodes={block.children} />
            </h3>
          );
        }
        if (block.kind === "paragraph") {
          return (
            <p key={key}>
              <InlineContent nodes={block.children} />
            </p>
          );
        }
        if (block.kind === "image") {
          return (
            <figure key={key}>
              <Image
                alt={block.alt}
                height={540}
                sizes="(max-width: 820px) 100vw, 760px"
                src={block.src}
                unoptimized={block.src.startsWith("/media/")}
                width={960}
              />
            </figure>
          );
        }
        const List = block.ordered ? "ol" : "ul";
        return (
          <List key={key}>
            {block.items.map((item, itemIndex) => (
              <li key={`${key}-${itemIndex}`}>
                <InlineContent nodes={item} />
              </li>
            ))}
          </List>
        );
      })}
    </div>
  );
}
