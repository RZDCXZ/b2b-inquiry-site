import { DownloadSimple } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Link from "next/link";

import {
  AdminPageHeader,
  PermissionDenied,
} from "@/src/components/admin/admin-page";
import { ProductImportSteps } from "@/src/components/admin/product-import-steps";
import { ProductImportUploadForm } from "@/src/components/admin/product-import-upload-form";
import { PRODUCT_IMPORT_SHEETS } from "@/src/modules/catalog/public/product-import";
import { PERMISSIONS } from "@/src/modules/identity-access/public/permissions";
import { authorizeAdminPage } from "@/src/modules/identity-access/server/authorization";

export const metadata: Metadata = { title: "Excel 批量导入 | Torquelis" };

export default async function ImportPage() {
  const { actor, allowed } = await authorizeAdminPage(
    PERMISSIONS.IMPORTS_MANAGE,
    "/admin/import",
  );

  if (!allowed) return <PermissionDenied role={actor.role} />;

  return (
    <>
      <div className="product-import-heading">
        <AdminPageHeader
          description="五个工作表使用产品编号作为跨表身份键；任一错误都会阻止整批导入。"
          eyebrow="产品内容 / 批量导入"
          title="上传并校验 Excel"
        />
        <Link
          className="admin-secondary-button"
          download
          href="/admin/import/template"
          target="_blank"
        >
          <DownloadSimple aria-hidden="true" /> 下载模板与字段说明
        </Link>
      </div>
      <ProductImportSteps current={1} />
      <div className="product-import-upload-grid">
        <section className="product-import-contract admin-section">
          <p>工作簿结构</p>
          <h2>需要 5 个命名工作表</h2>
          <div>
            {PRODUCT_IMPORT_SHEETS.map((sheet, index) => (
              <span key={sheet}>
                <b>{String(index + 1).padStart(2, "0")}</b>
                {sheet}
              </span>
            ))}
          </div>
          <small>
            “字段说明”工作表供编辑参考，不参与导入。未出现在“产品”工作表中的现有产品保持不变。
          </small>
        </section>
        <section className="admin-section">
          <ProductImportUploadForm />
        </section>
      </div>
    </>
  );
}
