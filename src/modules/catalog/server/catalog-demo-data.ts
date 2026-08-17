import type { Prisma, PrismaClient } from "@/src/generated/prisma/client";
import {
  DEMO_CATALOG_CATEGORIES,
  DEMO_CATALOG_PRODUCTS,
  DEMO_DATASET_TIMESTAMP,
  DEMO_PUBLISHED_PRODUCTS,
} from "@/src/modules/catalog/public/demo-catalog-fixtures";

async function writeCatalogIdentities(
  transaction: Prisma.TransactionClient,
): Promise<void> {
  for (const category of DEMO_CATALOG_CATEGORIES) {
    await transaction.productCategory.upsert({
      create: category,
      update: category,
      where: { id: category.id },
    });
  }

  for (const fixture of DEMO_CATALOG_PRODUCTS) {
    const product = {
      categoryId: fixture.categoryId,
      createdAt: DEMO_DATASET_TIMESTAMP,
      id: fixture.id,
      imagePath: fixture.imagePath,
      partNumber: fixture.partNumber,
      updatedAt: DEMO_DATASET_TIMESTAMP,
    };
    await transaction.product.upsert({
      create: product,
      update: product,
      where: { id: product.id },
    });
  }
}

export async function seedCatalogIdentities(
  prisma: PrismaClient,
): Promise<void> {
  await prisma.$transaction((transaction) =>
    writeCatalogIdentities(transaction),
  );
}

export async function replaceCatalogIdentities(
  prisma: PrismaClient,
): Promise<void> {
  await prisma.$transaction(async (transaction) => {
    await transaction.$executeRaw`
      SELECT set_config(
        'torquelis.allow_product_publication_mutation',
        'on',
        true
      )
    `;
    await transaction.productDraft.updateMany({
      data: {
        replacementProductId: null,
        restoredFromPublicationId: null,
      },
    });
    await transaction.productPublication.updateMany({
      data: {
        replacementProductId: null,
        restoredFromPublicationId: null,
      },
    });
    await transaction.product.deleteMany();
    await transaction.specificationAttributeDefinition.deleteMany();
    await transaction.productCategory.deleteMany();
    await writeCatalogIdentities(transaction);
  });
}

export async function seedCatalogProductLifecycleDemoData(
  prisma: PrismaClient,
): Promise<void> {
  await prisma.$transaction(async (transaction) => {
    for (const fixture of DEMO_PUBLISHED_PRODUCTS) {
      await transaction.product.update({
        data: {
          currentPublicationId: fixture.publicationId,
          replacementProductId: fixture.replacementProductId,
          status: fixture.status,
          updatedAt: DEMO_DATASET_TIMESTAMP,
        },
        where: { id: fixture.id },
      });
    }

    await transaction.product.update({
      data: {
        currentPublicationId: null,
        replacementProductId: null,
        status: "draft",
        updatedAt: DEMO_DATASET_TIMESTAMP,
      },
      where: { id: "product-tq-df-9000" },
    });
  });
}

export async function seedProductReferenceDemoData(
  prisma: PrismaClient,
): Promise<void> {
  await prisma.$transaction(async (transaction) => {
    await transaction.$executeRaw`
      SELECT set_config(
        'torquelis.allow_product_publication_mutation',
        'on',
        true
      )
    `;
    await transaction.productReference.createMany({
      data: DEMO_PUBLISHED_PRODUCTS.flatMap((fixture) =>
        fixture.references.map((reference, index) => ({
          ...reference,
          id: `reference-${fixture.id}-${index + 1}`,
          publicationId: fixture.publicationId!,
        })),
      ),
      skipDuplicates: true,
    });
  });
}
