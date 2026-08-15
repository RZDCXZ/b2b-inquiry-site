import {
  CheckCircle,
  DownloadSimple,
  FileArrowUp,
  Warning,
  XCircle,
} from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import {
  getProductImportPreview,
  ProductImportError,
} from "@/src/application/product-import";
import {
  AdminPageHeader,
  PermissionDenied,
} from "@/src/components/admin/admin-page";
import { ProductImportConfirmForm } from "@/src/components/admin/product-import-confirm-form";
import { ProductImportSteps } from "@/src/components/admin/product-import-steps";
import { PRODUCT_IMPORT_SHEETS } from "@/src/modules/catalog/public/product-import";
import { PERMISSIONS } from "@/src/modules/identity-access/public/permissions";
import { authorizeAdminPage } from "@/src/modules/identity-access/server/authorization";

export const metadata: Metadata = { title: "Excel 导入预览 | Torquelis" };

const notices: Record<string, string> = {
  "already-confirmed": "这份预览已经确认，不能重复执行导入。",
  forbidden: "你没有确认导入的权限。",
  "has-validation-errors": "工作簿仍有错误，整批导入未执行。",
  "preview-stale":
    "预览后产品草稿已发生变化。整批导入未执行，请重新上传并校验。",
  "transaction-failed":
    "导入事务失败，没有产品被部分写入。请重试或检查工作簿。",
};

const routeParamsSchema = z.object({ previewId: z.string().uuid() });
const searchParamsSchema = z.object({
  code: z.preprocess(
    firstParam,
    z
      .string()
      .regex(/^[A-Z_]+$/)
      .max(100)
      .optional(),
  ),
  notice: z.preprocess(
    firstParam,
    z
      .enum([
        "already-confirmed",
        "forbidden",
        "has-validation-errors",
        "preview-stale",
        "transaction-failed",
      ])
      .optional(),
  ),
  sheet: z.preprocess(
    firstParam,
    z.enum([...PRODUCT_IMPORT_SHEETS, "工作簿"]).optional(),
  ),
});
const fileErrorCodes = new Set([
  "COLUMN_MISSING",
  "FILE_EMPTY",
  "FILE_SIGNATURE_INVALID",
  "FILE_TOO_LARGE",
  "FILE_TYPE_INVALID",
  "ROW_LIMIT_EXCEEDED",
  "SHEET_MISSING",
  "WORKBOOK_PARSE_FAILED",
]);

function firstParam(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ProductImportPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ previewId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parsedParams = routeParamsSchema.safeParse(await params);
  if (!parsedParams.success) notFound();
  const { previewId } = parsedParams.data;
  const query = await searchParams;
  const parsedQuery = searchParamsSchema.safeParse(query);
  const path = `/admin/import/previews/${encodeURIComponent(previewId)}`;
  const { actor, allowed } = await authorizeAdminPage(
    PERMISSIONS.IMPORTS_MANAGE,
    path,
  );
  if (!allowed) return <PermissionDenied role={actor.role} />;

  const preview = await getProductImportPreview({ actor, previewId }).catch(
    (error: unknown) => {
      if (error instanceof ProductImportError && error.code === "NOT_FOUND") {
        notFound();
      }
      throw error;
    },
  );
  const fileErrors = preview.errors.filter(({ code }) =>
    fileErrorCodes.has(code),
  );
  const dataErrors = preview.errors.filter(
    ({ code }) => !fileErrorCodes.has(code),
  );
  const selectedSheet = parsedQuery.success
    ? (parsedQuery.data.sheet ?? "")
    : "";
  const selectedCode = parsedQuery.success ? (parsedQuery.data.code ?? "") : "";
  const filteredErrors = dataErrors.filter(
    (error) =>
      (!selectedSheet || error.sheet === selectedSheet) &&
      (!selectedCode || error.code === selectedCode),
  );
  const sheets = [...new Set(dataErrors.map(({ sheet }) => sheet))];
  const codes = [...new Set(dataErrors.map(({ code }) => code))];
  const noticeCode = parsedQuery.success ? (parsedQuery.data.notice ?? "") : "";
  const notice = notices[noticeCode];
  const canConfirm =
    preview.canConfirm &&
    noticeCode !== "preview-stale" &&
    noticeCode !== "already-confirmed";
  const alreadyConfirmed = preview.status === "confirmed";
  const eligibilityReady = canConfirm || alreadyConfirmed;
  const eligibilityTitle = canConfirm
    ? "可以确认导入"
    : alreadyConfirmed
      ? "已经确认导入"
      : "禁止确认导入";
  const eligibilityDetail = canConfirm
    ? "只更新草稿，不自动发布"
    : alreadyConfirmed
      ? "该预览已经生成导入批次，不能重复确认"
      : noticeCode === "preview-stale"
        ? "数据已变化，请重新上传并校验"
        : "修正全部错误后重新上传";
  const additions = preview.products.filter(
    ({ changeKind }) => changeKind === "add",
  );
  const updates = preview.products.filter(
    ({ changeKind }) => changeKind === "update",
  );

  return (
    <>
      <div className="product-import-heading">
        <AdminPageHeader
          description="全部工作表已校验；存在任一错误时，确认导入保持禁用。"
          eyebrow="产品内容 / 批量导入 / 校验预览"
          title={
            preview.errors.length > 0
              ? `发现 ${preview.errors.length} 个校验错误`
              : alreadyConfirmed
                ? "草稿导入已经完成"
                : "确认草稿差异"
          }
        />
        <Link className="admin-secondary-button" href="/admin/import">
          <FileArrowUp aria-hidden="true" /> 重新上传
        </Link>
      </div>
      <ProductImportSteps
        current={alreadyConfirmed ? 4 : 2}
        followConfirmation={!alreadyConfirmed}
      />
      {notice ? (
        <div className="product-import-notice is-danger" role="alert">
          <Warning aria-hidden="true" />
          <div>
            <strong>导入未执行</strong>
            <p>{notice}</p>
          </div>
        </div>
      ) : null}
      <section className="product-import-preview admin-section">
        <div className="product-import-summary">
          {[
            [preview.addedCount, "新增草稿"],
            [preview.updatedCount, "更新草稿"],
            [preview.errors.length, "校验错误"],
            [preview.affectedProductCount, "受影响产品"],
          ].map(([value, label]) => (
            <div key={label}>
              <strong
                className={label === "校验错误" && value ? "is-danger" : ""}
              >
                {value}
              </strong>
              <span>{label}</span>
            </div>
          ))}
          <div className={eligibilityReady ? "is-ready" : "is-blocked"}>
            {eligibilityReady ? (
              <CheckCircle aria-hidden="true" weight="fill" />
            ) : (
              <XCircle aria-hidden="true" weight="fill" />
            )}
            <span>
              <strong>{eligibilityTitle}</strong>
              <small>{eligibilityDetail}</small>
            </span>
          </div>
        </div>

        {preview.errors.length > 0 ? (
          <>
            <div className="product-import-notice is-danger">
              <XCircle aria-hidden="true" weight="fill" />
              <div>
                <strong>整批导入已暂停</strong>
                <p>
                  文件结构与业务数据问题分别列出。没有产品被新增、更新或部分写入。
                </p>
              </div>
            </div>
            {fileErrors.length > 0 ? (
              <section
                aria-labelledby="product-import-file-error-title"
                className="product-import-file-errors"
              >
                <header>
                  <strong id="product-import-file-error-title">
                    文件与模板结构问题
                  </strong>
                  <span>{fileErrors.length} 项</span>
                </header>
                <ul>
                  {fileErrors.map((error, index) => (
                    <li key={`${error.code}-${error.sheet}-${index}`}>
                      <span className="product-import-file-error-meta">
                        <code>{error.code}</code>
                        <small>
                          {error.sheet} ·{" "}
                          {error.row ? `第 ${error.row} 行` : "文件级"} ·{" "}
                          {error.field}
                        </small>
                      </span>
                      <span>
                        <strong>{error.issue}</strong>
                        <small>{error.suggestion}</small>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            {dataErrors.length > 0 ? (
              <>
                <div className="product-import-error-heading">
                  <strong>业务数据问题</strong>
                  <span>{dataErrors.length} 项</span>
                </div>
                <form className="product-import-filters">
                  <label>
                    <span>工作表</span>
                    <select defaultValue={selectedSheet} name="sheet">
                      <option value="">全部</option>
                      {sheets.map((sheet) => (
                        <option key={sheet}>{sheet}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>错误代码</span>
                    <select defaultValue={selectedCode} name="code">
                      <option value="">全部</option>
                      {codes.map((code) => (
                        <option key={code}>{code}</option>
                      ))}
                    </select>
                  </label>
                  <button className="admin-secondary-button" type="submit">
                    筛选错误
                  </button>
                  <Link className="admin-secondary-button" href={path}>
                    清除筛选
                  </Link>
                </form>
                {filteredErrors.length > 0 ? (
                  <div className="product-import-table-wrap">
                    <table className="product-import-error-table">
                      <thead>
                        <tr>
                          <th>工作表 / 行</th>
                          <th>字段</th>
                          <th>错误代码</th>
                          <th>问题</th>
                          <th>修正建议</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredErrors.map((error, index) => (
                          <tr
                            key={`${error.sheet}-${error.row}-${error.field}-${error.code}-${index}`}
                          >
                            <td>
                              <strong>{error.sheet}</strong>
                              <small>
                                {error.row ? `第 ${error.row} 行` : "文件级"}
                              </small>
                            </td>
                            <td>
                              <code>{error.field}</code>
                            </td>
                            <td>
                              <code className="product-import-error-code">
                                {error.code}
                              </code>
                            </td>
                            <td>{error.issue}</td>
                            <td>{error.suggestion}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="product-import-filter-empty" role="status">
                    <strong>当前筛选没有匹配错误</strong>
                    <span>调整工作表或错误代码，或清除筛选查看全部问题。</span>
                    <Link className="admin-secondary-button" href={path}>
                      查看全部业务错误
                    </Link>
                  </div>
                )}
              </>
            ) : null}
          </>
        ) : (
          <>
            <div className="product-import-notice is-success">
              <CheckCircle aria-hidden="true" weight="fill" />
              <div>
                <strong>全部校验通过</strong>
                <p>
                  未出现在工作簿中的产品保持不变。确认后在一个 PostgreSQL
                  事务中更新草稿。
                </p>
              </div>
            </div>
            <div className="product-import-diff">
              <article>
                <header>
                  <strong>新增</strong>
                  <span>{additions.length} 个草稿 · 未公开</span>
                </header>
                {additions.map((product) => (
                  <div
                    className="product-import-addition"
                    key={product.partNumber}
                  >
                    <code>{product.partNumber}</code>
                    <span>{product.categoryNameZhCn}</span>
                    <strong>{product.translations.zhCn.name}</strong>
                  </div>
                ))}
              </article>
              <article>
                <header>
                  <strong>更新</strong>
                  <span>{updates.length} 个草稿 · 未公开</span>
                </header>
                {updates.map((product) => (
                  <section
                    className="product-import-update"
                    key={product.partNumber}
                  >
                    <header>
                      <code>{product.partNumber}</code>
                      <span>
                        v{product.baselineDraftVersion} → v
                        {(product.baselineDraftVersion ?? 0) + 1}
                      </span>
                    </header>
                    {product.changes.length > 0 ? (
                      <dl>
                        {product.changes.map((change) => (
                          <div key={change.field}>
                            <dt>{change.field}</dt>
                            <dd>
                              <del>{change.before}</del>
                              <b aria-hidden="true">→</b>
                              <ins>{change.after}</ins>
                            </dd>
                          </div>
                        ))}
                      </dl>
                    ) : (
                      <p>工作簿内容与当前草稿相同；确认仍会生成新草稿版本。</p>
                    )}
                  </section>
                ))}
              </article>
            </div>
          </>
        )}

        <div className="product-import-preview-actions">
          {preview.errors.length > 0 ? (
            <Link
              className="admin-secondary-button"
              download
              href={`${path}/errors`}
              target="_blank"
            >
              <DownloadSimple aria-hidden="true" /> 下载错误报告
            </Link>
          ) : (
            <span />
          )}
          <ProductImportConfirmForm
            disabled={!canConfirm}
            disabledLabel={alreadyConfirmed ? "已确认导入" : undefined}
            previewId={preview.id}
          />
        </div>
      </section>
    </>
  );
}
