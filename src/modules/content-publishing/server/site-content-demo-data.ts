import type { Prisma, PrismaClient } from "@/src/generated/prisma/client";
import type {
  CorePageKey,
  CorePageTranslation,
} from "@/src/modules/content-publishing/public/core-page-contracts";

type PageFixture = {
  contentEn: CorePageTranslation;
  contentZhCn: CorePageTranslation;
  key: CorePageKey;
};

const pageFixtures: PageFixture[] = [
  {
    key: "home",
    contentEn: {
      eyebrow: "COMMERCIAL VEHICLE FILTRATION",
      title: "Find the right filter, without the guesswork.",
      lede: "Search Torquelis part numbers, cross-references or commercial vehicle applications, then send a structured inquiry with the product context attached.",
      sections: [
        {
          id: "finder_intro",
          heading: "Three exact ways to search",
          body: "Start with a Torquelis part number, a cross-reference, or a verified vehicle and specification context.",
        },
        {
          id: "process",
          heading: "From fitment to follow-up",
          body: "Find, verify and inquire without losing the selected product context.",
        },
        {
          id: "private_label",
          heading: "Private-label context, kept precise",
          body: "Discuss brand and packaging requirements for standard replacement filters without implying original-equipment supply.",
        },
        {
          id: "resources",
          heading: "Technical notes for product decisions",
          body: "Read maintained guidance about fitment, dimensions and replacement-number ambiguity.",
        },
      ],
    },
    contentZhCn: {
      eyebrow: "商用车滤清产品",
      title: "准确找到滤清器，不靠猜测。",
      lede: "通过拓擎利产品编号、参考号或商用车型应用查找标准替换件，再携带完整产品上下文提交结构化询盘。",
      sections: [
        {
          id: "finder_intro",
          heading: "三条准确查找路径",
          body: "可从产品编号、参考号，或已核对的车型与规格上下文开始。",
        },
        {
          id: "process",
          heading: "从适配到跟进",
          body: "查找、核对并提交询盘，过程中不丢失已选产品上下文。",
        },
        {
          id: "private_label",
          heading: "边界清楚的贴牌沟通",
          body: "围绕标准替换件讨论品牌与包装要求，不暗示原厂配套关系。",
        },
        {
          id: "resources",
          heading: "服务产品判断的技术文章",
          body: "阅读关于适配、尺寸和参考号歧义的持续维护内容。",
        },
      ],
    },
  },
  {
    key: "private_label",
    contentEn: {
      eyebrow: "PRIVATE LABEL",
      title:
        "A structured path from standard filter to your packaging context.",
      lede: "Private-label inquiries start with an identifiable standard replacement filter, target market and packaging requirement.",
      sections: [
        {
          id: "approach",
          heading: "Start with a maintained product identity",
          body: "Use the catalogue product number and fitment context as the stable basis for discussion.",
        },
        {
          id: "packaging",
          heading: "Describe branding and packaging separately",
          body: "Record brand, target market and custom packaging needs without changing the product identity.",
        },
        {
          id: "inquiry",
          heading: "Send one clear inquiry",
          body: "Share expected quantity and requirements through the structured inquiry form.",
        },
      ],
    },
    contentZhCn: {
      eyebrow: "贴牌服务",
      title: "从标准替换件到包装需求的结构化沟通路径。",
      lede: "贴牌询盘以可识别的标准替换件、目标市场和包装要求为起点。",
      sections: [
        {
          id: "approach",
          heading: "从稳定产品身份开始",
          body: "以目录产品编号和适配上下文作为沟通的稳定基础。",
        },
        {
          id: "packaging",
          heading: "分别说明品牌和包装",
          body: "记录品牌、目标市场和定制包装需求，不改变产品身份。",
        },
        {
          id: "inquiry",
          heading: "提交一张清楚的询盘",
          body: "通过结构化询盘表单说明预计数量与具体要求。",
        },
      ],
    },
  },
  {
    key: "manufacturing_quality",
    contentEn: {
      eyebrow: "MANUFACTURING & QUALITY",
      title: "Maintain the specification trail behind each catalogue decision.",
      lede: "This fictional demo focuses on traceable product data and repeatable review steps rather than unverifiable certification claims.",
      sections: [
        {
          id: "process_control",
          heading: "Controlled catalogue inputs",
          body: "Category definitions, units and required fields keep product records comparable.",
        },
        {
          id: "verification",
          heading: "Verify fitment and dimensions",
          body: "Review structured specifications and application context before sending an inquiry.",
        },
        {
          id: "demo_boundary",
          heading: "Demo data, clearly bounded",
          body: "All performance values are fictional and must not be used for selection or purchasing.",
        },
      ],
    },
    contentZhCn: {
      eyebrow: "制造与品控",
      title: "保留每次目录判断背后的规格链路。",
      lede: "本虚构演示强调可追溯产品数据和可重复核对步骤，不使用无法验证的认证声明。",
      sections: [
        {
          id: "process_control",
          heading: "受控的目录输入",
          body: "分类定义、单位和必填字段让产品记录保持可比较。",
        },
        {
          id: "verification",
          heading: "核对适配与尺寸",
          body: "提交询盘前检查结构化规格和应用上下文。",
        },
        {
          id: "demo_boundary",
          heading: "持续可见的演示边界",
          body: "所有性能数值均为虚构演示数据，不可用于选型或采购。",
        },
      ],
    },
  },
  {
    key: "technical_resources",
    contentEn: {
      eyebrow: "TECHNICAL RESOURCES",
      title: "Technical notes written for product decisions.",
      lede: "Browse maintained editorial topics about fitment, specification units, replacement numbers and inquiry context.",
      sections: [
        {
          id: "editorial_scope",
          heading: "Narrow, practical editorial scope",
          body: "Articles explain how to interpret the fictional catalogue without making certification or performance claims.",
        },
        {
          id: "article_index",
          heading: "Browse published notes",
          body: "Each language is released independently, so availability is always explicit.",
        },
      ],
    },
    contentZhCn: {
      eyebrow: "技术资源",
      title: "服务产品判断的技术文章。",
      lede: "浏览关于适配、规格单位、替换号码和询盘上下文的持续维护主题。",
      sections: [
        {
          id: "editorial_scope",
          heading: "克制且实用的编辑范围",
          body: "文章解释如何理解虚构目录，不制造认证或性能结论。",
        },
        {
          id: "article_index",
          heading: "浏览已发布文章",
          body: "各语言独立发布，因此版本可用性始终明确。",
        },
      ],
    },
  },
  {
    key: "about",
    contentEn: {
      eyebrow: "ABOUT TORQUELIS",
      title:
        "A fictional manufacturer built to demonstrate a maintained inquiry system.",
      lede: "Torquelis Filters is an invented commercial-vehicle filtration company used to make product, content and inquiry workflows verifiable.",
      sections: [
        {
          id: "manufacturer_profile",
          heading: "A deliberate demonstration boundary",
          body: "No customer logos, certifications, factory claims or commercial results are represented as real.",
        },
        {
          id: "maintained_catalog",
          heading: "Content connected to structured products",
          body: "Bilingual pages, articles and product records share a controlled publication workflow.",
        },
      ],
    },
    contentZhCn: {
      eyebrow: "关于拓擎利",
      title: "一家用于演示可维护询盘系统的虚构制造企业。",
      lede: "拓擎利滤清是一家虚构的商用车滤清器企业，用于让产品、内容和询盘工作流可以被验证。",
      sections: [
        {
          id: "manufacturer_profile",
          heading: "明确的演示边界",
          body: "不把客户标志、认证、工厂声明或商业结果表达为真实信息。",
        },
        {
          id: "maintained_catalog",
          heading: "连接结构化产品的内容",
          body: "双语页面、文章和产品记录共用受控发布流程。",
        },
      ],
    },
  },
  {
    key: "contact",
    contentEn: {
      eyebrow: "CONTACT / GENERAL INQUIRY",
      title: "Send the product context your next conversation needs.",
      lede: "Use a product inquiry when you have identified a filter, or a general inquiry for private-label and broader catalogue needs.",
      sections: [
        {
          id: "inquiry_guidance",
          heading: "One inquiry, one clear context",
          body: "Include expected quantity, market and packaging needs without uploading sensitive attachments.",
        },
        {
          id: "response_context",
          heading: "Captured by a local demo workflow",
          body: "The system records a safe reference and simulated notification; it does not claim a real email was delivered.",
        },
      ],
    },
    contentZhCn: {
      eyebrow: "联系／通用询盘",
      title: "提交下一次沟通真正需要的产品上下文。",
      lede: "已经找到滤清器时使用产品询盘；贴牌或更广泛的目录需求可使用通用询盘。",
      sections: [
        {
          id: "inquiry_guidance",
          heading: "一张询盘，一个清楚上下文",
          body: "说明预计数量、目标市场和包装需求，不上传敏感附件。",
        },
        {
          id: "response_context",
          heading: "由本地演示流程捕获",
          body: "系统记录安全参考号和模拟通知，但不声称真实邮件已经送达。",
        },
      ],
    },
  },
];

const articleFixtures = [
  {
    id: "article-fitment-basics",
    topicKey: "commercial-vehicle-fitment-basics",
    translations: [
      {
        locale: "en" as const,
        title: "Commercial vehicle fitment basics",
        slug: "commercial-vehicle-fitment-basics",
        excerpt: "A compact guide to make, model, year and engine context.",
        seoTitle: "Commercial vehicle fitment basics",
        seoDescription:
          "How to read fictional commercial vehicle fitment context.",
        body: "## Read the complete application\n\nConfirm **make, model, year and engine** before comparing filter specifications.\n\n- Keep the year range visible\n- Check the exact engine code",
      },
      {
        locale: "zh_cn" as const,
        title: "商用车适配关系基础",
        slug: "商用车适配关系基础",
        excerpt: "理解品牌、车型、年份与发动机上下文的简要指南。",
        seoTitle: "商用车适配关系基础",
        seoDescription: "如何阅读虚构商用车适配上下文。",
        body: "## 阅读完整应用信息\n\n比较滤清器规格前，确认**品牌、车型、年份和发动机**。\n\n- 保留年份范围\n- 核对准确发动机型号",
      },
    ],
  },
  {
    id: "article-units",
    topicKey: "metric-and-imperial-filter-dimensions",
    translations: [
      {
        locale: "en" as const,
        title: "Metric and imperial filter dimensions",
        slug: "metric-and-imperial-filter-dimensions",
        excerpt: "How converted dimensions remain labelled and comparable.",
        seoTitle: "Metric and imperial filter dimensions",
        seoDescription: "Understand labelled filter dimension conversions.",
        body: "## Keep the base unit visible\n\nConverted values support comparison but do not replace the maintained metric value.\n\n1. Check the metric dimension\n2. Treat imperial values as converted",
      },
      {
        locale: "zh_cn" as const,
        title: "滤清器公英制尺寸",
        slug: "滤清器公英制尺寸",
        excerpt: "了解换算尺寸如何保持明确标识和可比较。",
        seoTitle: "滤清器公英制尺寸",
        seoDescription: "理解有明确标识的滤清器尺寸换算。",
        body: "## 保留基准单位\n\n换算值用于比较，但不会替代维护的公制值。\n\n1. 先检查公制尺寸\n2. 将英制值视为换算结果",
      },
    ],
  },
  {
    id: "article-replacement-numbers",
    topicKey: "reading-replacement-numbers",
    translations: [
      {
        locale: "en" as const,
        title: "Reading replacement numbers",
        slug: "reading-replacement-numbers",
        excerpt:
          "Separate supplier product identity from cross-reference evidence.",
        seoTitle: "Reading replacement numbers",
        seoDescription: "Keep product numbers and cross-references distinct.",
        body: "## Product number first\n\nA Torquelis product number identifies one catalogue item. A cross-reference may match more than one.\n\n[Search the catalogue](/en/products) before sending an inquiry.",
      },
      {
        locale: "zh_cn" as const,
        title: "如何阅读替换号码",
        slug: "如何阅读替换号码",
        excerpt: "区分供应方产品身份与参考号证据。",
        seoTitle: "如何阅读替换号码",
        seoDescription: "保持产品编号与参考号语义分离。",
        body: "## 产品编号优先\n\n拓擎利产品编号标识一个目录项目；一个参考号可能匹配多个产品。\n\n提交询盘前先[查找目录](/zh-cn/products)。",
      },
    ],
  },
  {
    id: "article-reference-ambiguity",
    topicKey: "avoiding-cross-reference-ambiguity",
    translations: [
      {
        locale: "en" as const,
        title: "Avoiding cross-reference ambiguity",
        slug: "avoiding-cross-reference-ambiguity",
        excerpt:
          "Why a shared replacement number should show every exact match.",
        seoTitle: "Avoiding cross-reference ambiguity",
        seoDescription:
          "Review all products linked to an ambiguous cross-reference.",
        body: "## Never hide an exact match\n\nWhen one normalized reference number links to multiple products, review **every matching product** and its fitment context.",
      },
    ],
  },
];

async function writeContentData(transaction: Prisma.TransactionClient) {
  const publishedAt = new Date("2026-08-13T04:00:00.000Z");

  for (const fixture of pageFixtures) {
    await transaction.corePage.create({ data: { key: fixture.key } });
    const publication = await transaction.corePagePublication.create({
      data: {
        contentEn: fixture.contentEn,
        contentZhCn: fixture.contentZhCn,
        pageKey: fixture.key,
        publishedAt,
        sealedAt: publishedAt,
        sourceDraftVersion: 1,
        version: 1,
      },
    });
    await transaction.corePageDraft.create({
      data: {
        contentEn: fixture.contentEn,
        contentZhCn: fixture.contentZhCn,
        lastPublishedVersion: 1,
        pageKey: fixture.key,
        version: 1,
      },
    });
    await transaction.corePage.update({
      data: { currentPublicationId: publication.id },
      where: { key: fixture.key },
    });
  }

  for (const fixture of articleFixtures) {
    await transaction.article.create({
      data: { id: fixture.id, topicKey: fixture.topicKey },
    });
    for (const translation of fixture.translations) {
      const publication = await transaction.articlePublication.create({
        data: {
          ...translation,
          articleId: fixture.id,
          publishedAt,
          sealedAt: publishedAt,
          sourceDraftVersion: 1,
          version: 1,
        },
      });
      await transaction.articleDraft.create({
        data: {
          ...translation,
          articleId: fixture.id,
          currentPublicationId: publication.id,
          lastPublishedVersion: 1,
          version: 1,
        },
      });
    }
  }
}

export async function seedSiteContent(prisma: PrismaClient): Promise<void> {
  if (
    (await prisma.corePage.count()) > 0 ||
    (await prisma.article.count()) > 0
  ) {
    return;
  }
  await prisma.$transaction(writeContentData);
}

export async function replaceSiteContent(prisma: PrismaClient): Promise<void> {
  await prisma.$transaction(async (transaction) => {
    await transaction.$executeRawUnsafe(
      "SELECT set_config('torquelis.allow_content_publication_mutation', 'on', true)",
    );
    await transaction.corePage.updateMany({
      data: { currentPublicationId: null },
    });
    await transaction.articleDraft.updateMany({
      data: {
        currentPublicationId: null,
        restoredFromPublicationId: null,
      },
    });
    await transaction.corePageDraft.updateMany({
      data: { restoredFromPublicationId: null },
    });
    await transaction.corePagePublication.updateMany({
      data: { restoredFromPublicationId: null },
    });
    await transaction.articlePublication.updateMany({
      data: { restoredFromPublicationId: null },
    });
    await transaction.corePagePublication.deleteMany();
    await transaction.corePage.deleteMany();
    await transaction.articlePublication.deleteMany();
    await transaction.article.deleteMany();
    await writeContentData(transaction);
  });
}
