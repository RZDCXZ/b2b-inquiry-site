import type { ApplicationDatabase } from "@/src/infrastructure/database/prisma";
import { normalizeProductNumber } from "@/src/modules/catalog/public/product-identity";
import type { ProductStatus } from "@/src/modules/catalog/public/product-lifecycle";

export type ProductLifecycleErrorCode =
  | "PRODUCT_NOT_FOUND"
  | "PUBLICATION_REQUIRED"
  | "REPLACEMENT_NOT_FOUND"
  | "REPLACEMENT_NOT_PUBLIC"
  | "REPLACEMENT_CYCLE"
  | "REPLACEMENT_SELF_REFERENCE"
  | "REPLACEMENT_STATUS_INVALID";

export class ProductLifecycleError extends Error {
  constructor(
    readonly code: ProductLifecycleErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ProductLifecycleError";
  }
}

export async function setProductLifecycle({
  partNumber,
  prisma,
  replacementPartNumber,
  status,
}: {
  partNumber: string;
  prisma: ApplicationDatabase;
  replacementPartNumber?: string;
  status: ProductStatus;
}): Promise<{
  partNumber: string;
  replacementPartNumber: string | null;
  status: ProductStatus;
}> {
  return prisma.$transaction(
    async (transaction) => {
      const product = await transaction.product.findUnique({
        select: {
          currentPublicationId: true,
          id: true,
          partNumber: true,
        },
        where: { normalizedPartNumber: normalizeProductNumber(partNumber) },
      });

      if (!product) {
        throw new ProductLifecycleError(
          "PRODUCT_NOT_FOUND",
          `Product ${partNumber} does not exist.`,
        );
      }

      if (status !== "draft" && !product.currentPublicationId) {
        throw new ProductLifecycleError(
          "PUBLICATION_REQUIRED",
          "Published and discontinued products require a current publication.",
        );
      }

      if (status !== "discontinued" && replacementPartNumber) {
        throw new ProductLifecycleError(
          "REPLACEMENT_STATUS_INVALID",
          "Only discontinued products can have a replacement product.",
        );
      }

      const replacement = replacementPartNumber
        ? await transaction.product.findUnique({
            select: {
              currentPublicationId: true,
              id: true,
              partNumber: true,
              status: true,
            },
            where: {
              normalizedPartNumber: normalizeProductNumber(
                replacementPartNumber,
              ),
            },
          })
        : null;

      if (replacementPartNumber && !replacement) {
        throw new ProductLifecycleError(
          "REPLACEMENT_NOT_FOUND",
          `Replacement product ${replacementPartNumber} does not exist.`,
        );
      }

      if (replacement?.id === product.id) {
        throw new ProductLifecycleError(
          "REPLACEMENT_SELF_REFERENCE",
          "A product cannot replace itself.",
        );
      }

      if (
        replacement &&
        (replacement.status === "draft" || !replacement.currentPublicationId)
      ) {
        throw new ProductLifecycleError(
          "REPLACEMENT_NOT_PUBLIC",
          "A replacement product must have a current public representation.",
        );
      }

      if (replacement) {
        const replacementEdges = await transaction.product.findMany({
          select: { id: true, replacementProductId: true },
        });
        const nextProductIdById = new Map(
          replacementEdges.map(({ id, replacementProductId }) => [
            id,
            replacementProductId,
          ]),
        );
        const visitedProductIds = new Set<string>();
        let candidateProductId: string | null = replacement.id;

        while (candidateProductId) {
          if (
            candidateProductId === product.id ||
            visitedProductIds.has(candidateProductId)
          ) {
            throw new ProductLifecycleError(
              "REPLACEMENT_CYCLE",
              "Replacement products cannot form a cycle.",
            );
          }

          visitedProductIds.add(candidateProductId);
          candidateProductId =
            nextProductIdById.get(candidateProductId) ?? null;
        }
      }

      const updated = await transaction.product.update({
        data: {
          replacementProductId: replacement?.id ?? null,
          status,
        },
        select: { partNumber: true, status: true },
        where: { id: product.id },
      });

      return {
        ...updated,
        replacementPartNumber: replacement?.partNumber ?? null,
      };
    },
    { isolationLevel: "Serializable" },
  );
}
