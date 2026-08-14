import { z } from "zod";

export const CORE_PAGE_KEYS = [
  "home",
  "private_label",
  "manufacturing_quality",
  "technical_resources",
  "about",
  "contact",
] as const;

export type CorePageKey = (typeof CORE_PAGE_KEYS)[number];

export type CorePageTranslation = {
  eyebrow: string;
  lede: string;
  sections: Array<{
    body: string;
    heading: string;
    id: string;
  }>;
  title: string;
};

export const CORE_PAGE_DEFINITIONS: Record<
  CorePageKey,
  {
    label: string;
    route: string;
    sections: ReadonlyArray<{ id: string; label: string }>;
  }
> = {
  about: {
    label: "关于我们",
    route: "/about",
    sections: [
      { id: "manufacturer_profile", label: "演示企业定位" },
      { id: "maintained_catalog", label: "目录维护方式" },
    ],
  },
  contact: {
    label: "联系页",
    route: "/inquiry",
    sections: [
      { id: "inquiry_guidance", label: "询盘说明" },
      { id: "response_context", label: "后续流程" },
    ],
  },
  home: {
    label: "首页",
    route: "",
    sections: [
      { id: "finder_intro", label: "产品查找" },
      { id: "process", label: "查找至询盘" },
      { id: "private_label", label: "贴牌摘要" },
      { id: "resources", label: "技术资源" },
    ],
  },
  manufacturing_quality: {
    label: "制造与品控",
    route: "/quality",
    sections: [
      { id: "process_control", label: "过程控制" },
      { id: "verification", label: "规格核对" },
      { id: "demo_boundary", label: "演示边界" },
    ],
  },
  private_label: {
    label: "贴牌服务",
    route: "/private-label",
    sections: [
      { id: "approach", label: "合作方式" },
      { id: "packaging", label: "包装上下文" },
      { id: "inquiry", label: "询盘行动" },
    ],
  },
  technical_resources: {
    label: "技术资源",
    route: "/resources",
    sections: [
      { id: "editorial_scope", label: "编辑范围" },
      { id: "article_index", label: "文章索引" },
    ],
  },
};

const sectionSchema = z.object({
  body: z.string().max(4_000),
  heading: z.string().max(200),
  id: z.string().trim().min(1).max(80),
});

const translationSchema = z.object({
  eyebrow: z.string().max(120),
  lede: z.string().max(1_000),
  sections: z.array(sectionSchema).min(1).max(8),
  title: z.string().max(240),
});

export type CorePageValidation =
  | { content: CorePageTranslation; success: true }
  | { issues: string[]; success: false };

export function validateCorePageTranslation(
  key: CorePageKey,
  value: unknown,
): CorePageValidation {
  const parsed = translationSchema.safeParse(value);
  if (!parsed.success) {
    return {
      issues: parsed.error.issues.map(
        (issue) => `${issue.path.join(".") || "content"}: ${issue.message}`,
      ),
      success: false,
    };
  }

  const expectedIds = CORE_PAGE_DEFINITIONS[key].sections.map(({ id }) => id);
  const actualIds = parsed.data.sections.map(({ id }) => id);
  if (
    actualIds.length !== expectedIds.length ||
    actualIds.some((id, index) => id !== expectedIds[index])
  ) {
    return {
      issues: ["页面版块必须保持预设顺序，不能新增、删除或改名。"],
      success: false,
    };
  }

  const missing = [
    ["eyebrow", parsed.data.eyebrow],
    ["title", parsed.data.title],
    ["lede", parsed.data.lede],
    ...parsed.data.sections.flatMap((section) => [
      [`sections.${section.id}.heading`, section.heading],
      [`sections.${section.id}.body`, section.body],
    ]),
  ].filter((entry) => !entry[1].trim());
  if (missing.length > 0) {
    return {
      issues: missing.map(([field]) => `${field}: 发布前必须填写。`),
      success: false,
    };
  }

  return { content: parsed.data, success: true };
}

export function parseCorePageDraftTranslation(
  key: CorePageKey,
  value: unknown,
): CorePageTranslation {
  const parsed = translationSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error(parsed.error.message);
  }
  const expectedIds = CORE_PAGE_DEFINITIONS[key].sections.map(({ id }) => id);
  if (
    parsed.data.sections.length !== expectedIds.length ||
    parsed.data.sections.some(({ id }, index) => id !== expectedIds[index])
  ) {
    throw new Error("页面版块必须保持预设顺序，不能新增、删除或改名。");
  }
  return parsed.data;
}

export function parseCorePageTranslation(
  key: CorePageKey,
  value: unknown,
): CorePageTranslation {
  const parsed = validateCorePageTranslation(key, value);
  if (!parsed.success) {
    throw new Error(parsed.issues.join(" "));
  }
  return parsed.content;
}
