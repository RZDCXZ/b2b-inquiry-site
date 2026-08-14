import {
  Clock,
  Info,
  LockKey,
  Package,
  ShieldCheck,
} from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import Link from "next/link";

import type { getInquiryDetailForActor } from "@/src/application/admin-inquiries";
import { AdminPageHeader } from "@/src/components/admin/admin-page";
import {
  formatAdminDate,
  formatAdminTime,
} from "@/src/components/admin/admin-time";
import { InquiryAssignmentForm } from "@/src/components/admin/inquiry-assignment-form";
import { InquiryLifecycleActions } from "@/src/components/admin/inquiry-lifecycle-actions";
import { InquiryStatus } from "@/src/components/admin/inquiry-status";
import type { AdminActor } from "@/src/modules/identity-access/public/actor";
import { APP_ROLES } from "@/src/modules/identity-access/public/permissions";

type InquiryDetailView = Awaited<ReturnType<typeof getInquiryDetailForActor>>;

const closeResultLabels = {
  invalid: "无效",
  lost: "未成交",
  won: "成交",
} as const;

const followUpLabels = {
  contact: "联系记录",
  correction: "更正记录",
  internal_note: "内部备注",
  quote: "报价记录",
} as const;

const statusLabels = {
  assigned: "已分配",
  closed: "已关闭",
  in_progress: "跟进中",
  pending_assignment: "待分配",
  quoted: "已报价",
} as const;

function booleanLabel(value: boolean): string {
  return value ? "需要" : "不需要";
}

export function InquiryDetail({
  actor,
  detail,
  owners,
}: {
  actor: AdminActor;
  detail: InquiryDetailView;
  owners: Array<{ id: string; name: string }>;
}) {
  const administrator = actor.role === APP_ROLES.ADMINISTRATOR;
  const publication = detail.product?.currentPublication;
  const productLocale = detail.interfaceLanguage === "zh_cn" ? "zh-cn" : "en";
  const productName =
    detail.interfaceLanguage === "zh_cn"
      ? publication?.nameZhCn
      : publication?.nameEn;
  const productSlug =
    detail.interfaceLanguage === "zh_cn"
      ? publication?.slugZhCn
      : publication?.slugEn;
  const productHref =
    detail.product && productSlug
      ? `/${productLocale}/products/${encodeURIComponent(detail.product.partNumber)}/${productSlug}`
      : null;
  const correctableRecords = detail.followUps.map((record) => ({
    id: record.id,
    label: `${followUpLabels[record.type]} · ${formatAdminTime(record.occurredAt)}`,
  }));
  const timeline = [
    ...detail.assignmentHistory.map((event) => ({
      event,
      id: `assignment-${event.id}`,
      kind: "assignment" as const,
      occurredAt: event.assignedAt,
    })),
    ...detail.followUps.map((event) => ({
      event,
      id: `follow-up-${event.id}`,
      kind: "follow_up" as const,
      occurredAt: event.occurredAt,
    })),
    ...detail.statusChanges.map((event) => ({
      event,
      id: `status-${event.id}`,
      kind: "status_change" as const,
      occurredAt: event.occurredAt,
    })),
    {
      event: detail,
      id: `submission-${detail.id}`,
      kind: "submission" as const,
      occurredAt: detail.submittedAt,
    },
  ].sort(
    (left, right) =>
      right.occurredAt.getTime() - left.occurredAt.getTime() ||
      right.id.localeCompare(left.id),
  );

  return (
    <>
      <div className="inquiry-detail-heading">
        <AdminPageHeader
          description={`提交于 ${formatAdminTime(detail.submittedAt)} · ${detail.interfaceLanguage === "zh_cn" ? "中文前台" : "英文前台"}`}
          eyebrow="询盘运营 / 询盘详情"
          title={detail.referenceNumber}
        />
        {administrator && detail.status !== "closed" ? (
          <InquiryAssignmentForm
            currentOwnerId={detail.currentOwnerId}
            key={detail.version}
            owners={owners}
            referenceNumber={detail.referenceNumber}
            version={detail.version}
          />
        ) : null}
      </div>

      <section className="inquiry-summary-strip" aria-label="询盘责任摘要">
        <div>
          <span>状态</span>
          <InquiryStatus status={detail.status} />
        </div>
        <div>
          <span>当前负责人</span>
          <strong>{detail.currentOwner?.name ?? "尚未分配"}</strong>
        </div>
        <div>
          <span>下一步日期</span>
          <strong>
            {detail.nextStepDate ? formatAdminDate(detail.nextStepDate) : "—"}
          </strong>
        </div>
        <div>
          <span>关闭结果</span>
          <strong>
            {detail.closeResult ? closeResultLabels[detail.closeResult] : "—"}
          </strong>
          <small>当前版本 v{detail.version}</small>
        </div>
      </section>

      <div className="inquiry-detail-layout">
        <div>
          <section className="admin-section inquiry-contact-card">
            <div className="inquiry-section-title">
              <div>
                <p>采购需求</p>
                <h2>{detail.company}</h2>
              </div>
              <span>
                <ShieldCheck aria-hidden="true" /> 管理员与当前负责人可见
              </span>
            </div>
            <dl className="inquiry-detail-grid">
              <div>
                <dt>姓名</dt>
                <dd>{detail.contactName}</dd>
              </div>
              <div>
                <dt>国家或地区</dt>
                <dd>{detail.countryRegion}</dd>
              </div>
              <div>
                <dt>工作邮箱</dt>
                <dd>{detail.workEmail}</dd>
              </div>
              <div>
                <dt>电话 / WhatsApp</dt>
                <dd>{detail.phoneOrWhatsapp ?? "未提供"}</dd>
              </div>
              <div>
                <dt>预计采购量</dt>
                <dd>{detail.expectedQuantity}</dd>
              </div>
              <div>
                <dt>目标销售市场</dt>
                <dd>{detail.targetMarket ?? "未提供"}</dd>
              </div>
              <div>
                <dt>贴牌</dt>
                <dd>{booleanLabel(detail.privateLabelNeeded)}</dd>
              </div>
              <div>
                <dt>定制包装</dt>
                <dd>{booleanLabel(detail.customPackagingNeeded)}</dd>
              </div>
            </dl>
            <div className="inquiry-message-block">
              <span>留言</span>
              <p>{detail.message}</p>
            </div>
          </section>

          {detail.product ? (
            <section className="admin-section inquiry-linked-product">
              <Image
                alt={detail.product.partNumber}
                height={92}
                src={detail.product.imagePath}
                width={112}
              />
              <div>
                <p>关联产品</p>
                <h2>{detail.product.partNumber}</h2>
                <span>{productName}</span>
              </div>
              {productHref ? (
                <Link href={productHref} target="_blank">
                  查看采购前台
                </Link>
              ) : null}
            </section>
          ) : (
            <section className="admin-section inquiry-general-context">
              <Package aria-hidden="true" weight="thin" />
              <div>
                <strong>通用询盘</strong>
                <p>这张询盘没有关联标准替换件。</p>
              </div>
            </section>
          )}
        </div>

        <div className="inquiry-detail-sidebar">
          <aside className="admin-section inquiry-internal-card">
            <p>内部区域</p>
            <h2>责任与来源</h2>
            <dl>
              <div>
                <dt>来源页面</dt>
                <dd>{detail.sourcePage}</dd>
              </div>
              <div>
                <dt>界面语言</dt>
                <dd>
                  {detail.interfaceLanguage === "zh_cn" ? "简体中文" : "英文"}
                </dd>
              </div>
              <div>
                <dt>隐私同意时间</dt>
                <dd>{formatAdminTime(detail.privacyConsentAt)}</dd>
              </div>
              <div>
                <dt>最新修改</dt>
                <dd>
                  {detail.lastModifiedBy?.name ?? "系统提交"} ·{" "}
                  {formatAdminTime(detail.updatedAt)}
                </dd>
              </div>
            </dl>
            <div className="inquiry-internal-note">
              <Info aria-hidden="true" />
              <p>
                重新分配会立即撤销旧负责人的完整访问；历史不会被当前负责人字段覆盖。
              </p>
            </div>
          </aside>
          <InquiryLifecycleActions
            actorRole={actor.role}
            correctableRecords={correctableRecords}
            key={detail.version}
            referenceNumber={detail.referenceNumber}
            status={detail.status}
            version={detail.version}
          />
        </div>
      </div>

      <section className="admin-section inquiry-timeline">
        <header className="inquiry-section-title">
          <div>
            <p>不可变时间线</p>
            <h2>已经发生了什么</h2>
          </div>
          <span>
            <LockKey aria-hidden="true" /> 历史只读
          </span>
        </header>
        {timeline.map((item) => {
          let title: string;
          let body: React.ReactNode;
          let meta: React.ReactNode;

          if (item.kind === "assignment") {
            const assignment = item.event;
            title = assignment.previousOwner ? "重新分配" : "首次分配";
            body = `${assignment.previousOwner?.name ?? "未分配"} → ${assignment.newOwner.name}`;
            meta = (
              <>
                {assignment.assignedBy.name} · {assignment.reason} · v
                {assignment.fromVersion} → v{assignment.toVersion}
              </>
            );
          } else if (item.kind === "follow_up") {
            const followUp = item.event;
            title = followUpLabels[followUp.type];
            body = (
              <>
                {followUp.type === "quote" ? (
                  <b className="inquiry-quote-value">
                    {followUp.quoteCurrency} {followUp.quoteAmount?.toFixed(2)}{" "}
                    · 有效至 {formatAdminDate(followUp.quoteValidUntil!)}
                  </b>
                ) : null}
                {followUp.type === "correction" ? (
                  <span className="inquiry-correction-reference">
                    更正既有{followUpLabels[followUp.correctionOf!.type]}
                  </span>
                ) : null}
                {followUp.summary}
                {followUp.nextStepDate ? (
                  <span className="inquiry-next-step">
                    下一步：{formatAdminDate(followUp.nextStepDate)}
                  </span>
                ) : null}
              </>
            );
            meta = (
              <>
                {followUp.actor.name} · {statusLabels[followUp.statusBefore]} →{" "}
                {statusLabels[followUp.statusAfter]} · v{followUp.fromVersion} →
                v{followUp.toVersion}
              </>
            );
          } else if (item.kind === "status_change") {
            const change = item.event;
            title = change.toStatus === "closed" ? "关闭询盘" : "重新打开询盘";
            body = (
              <>
                {change.closeResult
                  ? `关闭结果：${closeResultLabels[change.closeResult]}`
                  : "恢复为已分配，全部历史继续保留。"}
                {change.reason ? (
                  <span className="inquiry-status-reason">{change.reason}</span>
                ) : null}
              </>
            );
            meta = (
              <>
                {change.actor.name} · {statusLabels[change.fromStatus]} →{" "}
                {statusLabels[change.toStatus]} · v{change.fromVersion} → v
                {change.toVersion}
              </>
            );
          } else {
            title = "询盘提交";
            body = detail.sourcePage;
            meta = "系统 · 状态进入待分配";
          }

          return (
            <article key={item.id}>
              <span className="inquiry-timeline-icon">
                <Clock aria-hidden="true" />
              </span>
              <div>
                <header>
                  <strong>{title}</strong>
                  <time>{formatAdminTime(item.occurredAt)}</time>
                </header>
                <p>{body}</p>
                <small>{meta}</small>
              </div>
            </article>
          );
        })}
      </section>
    </>
  );
}
