import {
  AdminPageHeader,
  AdminSection,
} from "@/src/components/admin/admin-page";

export function AdminPlaceholderSection({
  description,
  eyebrow,
  title,
}: {
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <>
      <AdminPageHeader
        description={description}
        eyebrow={eyebrow}
        title={title}
      />
      <AdminSection>
        <div className="admin-shell-state">
          <span>功能准备中</span>
          <h2>当前工作区暂无可处理数据</h2>
          <p>
            当前角色已通过服务端权限检查。业务数据可用后，此处会显示相应的运营任务与操作入口。
          </p>
        </div>
      </AdminSection>
    </>
  );
}
