import { listAssets } from "@/src/application/asset-management";
import {
  AdminPageHeader,
  PermissionDenied,
} from "@/src/components/admin/admin-page";
import {
  AssetManager,
  type AssetManagerAsset,
} from "@/src/components/admin/asset-manager";
import { PERMISSIONS } from "@/src/modules/identity-access/public/permissions";
import { authorizeAdminPage } from "@/src/modules/identity-access/server/authorization";

export default async function AssetsPage() {
  const { actor, allowed } = await authorizeAdminPage(
    PERMISSIONS.CONTENT_MANAGE,
    "/admin/assets",
  );
  if (!allowed) {
    return <PermissionDenied role={actor.role} />;
  }

  const assets = await listAssets({ actor });
  const view: AssetManagerAsset[] = assets.map((asset) => ({
    byteSize: asset.byteSize,
    createdAt: asset.createdAt.toISOString(),
    id: asset.id,
    imageAltEn: asset.imageAltEn,
    imageAltZhCn: asset.imageAltZhCn,
    kind: asset.kind,
    mimeType: asset.mimeType,
    originalFilename: asset.originalFilename,
    publicPath: asset.publicPath,
    references: asset.references,
    source: asset.source,
  }));

  return (
    <>
      <AdminPageHeader
        description="安全上传双语产品图片与 PDF 资料，查看草稿和不可变发布版本引用。"
        eyebrow="产品内容 / 图片与资料"
        title="素材管理"
      />
      <AssetManager assets={view} />
    </>
  );
}
