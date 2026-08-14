import { describe, expect, it } from "vitest";

import {
  parseRestrictedRichText,
  validateRestrictedRichText,
} from "@/src/modules/content-publishing/public/restricted-rich-text";

describe("restricted rich text", () => {
  it("accepts only the published editorial block and inline vocabulary", () => {
    const source = [
      "## Fitment notes",
      "",
      "Use **verified dimensions** and [open the catalogue](/en/products).",
      "",
      "- Confirm the vehicle model",
      "- Compare the engine code",
      "",
      "![Fuel filter cutaway](/assets/hero-filter-cutaway.png)",
    ].join("\n");

    expect(validateRestrictedRichText(source)).toEqual({ success: true });
    expect(parseRestrictedRichText(source)).toEqual([
      {
        children: [{ kind: "text", text: "Fitment notes" }],
        kind: "heading",
        level: 2,
      },
      {
        children: [
          { kind: "text", text: "Use " },
          {
            children: [{ kind: "text", text: "verified dimensions" }],
            kind: "strong",
          },
          { kind: "text", text: " and " },
          {
            children: [{ kind: "text", text: "open the catalogue" }],
            href: "/en/products",
            kind: "link",
          },
          { kind: "text", text: "." },
        ],
        kind: "paragraph",
      },
      {
        items: [
          [{ kind: "text", text: "Confirm the vehicle model" }],
          [{ kind: "text", text: "Compare the engine code" }],
        ],
        kind: "list",
        ordered: false,
      },
      {
        alt: "Fuel filter cutaway",
        kind: "image",
        src: "/assets/hero-filter-cutaway.png",
      },
    ]);
  });

  it.each([
    ["script", '<script>alert("x")</script>'],
    ["iframe", '<iframe src="https://example.com"></iframe>'],
    ["inline style", '<p style="color:red">unsafe</p>'],
    ["arbitrary HTML", "<section>unsafe</section>"],
    ["script link", "[click](javascript:alert(1))"],
    ["remote image", "![tracking pixel](https://tracker.example/pixel.png)"],
  ])("rejects %s content", (_label, source) => {
    const result = validateRestrictedRichText(source);

    expect(result.success).toBe(false);
  });
});
