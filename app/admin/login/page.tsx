import { Info, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/src/components/admin/login-form";
import { getCurrentActor } from "@/src/modules/identity-access/server/authorization";
import { parseLoginSearchParams } from "@/src/modules/identity-access/server/login-boundary";

export const metadata: Metadata = {
  title: "登录",
};

type LoginPageProps = {
  searchParams: Promise<{
    loggedOut?: string | string[];
    next?: string | string[];
    reason?: string | string[];
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const [actor, rawQuery] = await Promise.all([
    getCurrentActor(),
    searchParams,
  ]);
  const query = parseLoginSearchParams(rawQuery);

  if (actor) {
    redirect(query.nextPath);
  }

  return (
    <main className="admin-login-page">
      <section className="admin-login-intro">
        <div>
          <p>TORQUELIS FILTERS</p>
          <span>拓擎利滤清 · 本地演示系统</span>
        </div>
        <div className="admin-login-story">
          <p>INQUIRY OPERATIONS</p>
          <h1>让产品信息与每一次业务跟进保持连接。</h1>
          <span>
            预置角色共享同一套数据库会话，但由服务端权限矩阵限制可见内容与可执行操作。
          </span>
        </div>
        <div className="admin-login-boundary">
          <ShieldCheck aria-hidden="true" size={23} weight="fill" />
          <span>仅用于本机演示。所有企业、产品与询盘数据均为虚构。</span>
        </div>
      </section>
      <section className="admin-login-panel">
        <div className="admin-login-card">
          <p className="admin-kicker">运营后台</p>
          <h2>登录运营后台</h2>
          <p className="admin-login-description">
            使用初始化时生成的管理员、内容编辑或业务人员凭据登录。
          </p>
          {query.loggedOut === "1" ? (
            <div className="admin-login-notice" role="status">
              已安全退出，数据库会话已撤销。
            </div>
          ) : null}
          {query.reason === "expired" ? (
            <div className="admin-login-notice" role="status">
              会话已过期，请重新登录。
            </div>
          ) : null}
          <LoginForm nextPath={query.nextPath} />
          <div className="admin-credential-help">
            <Info aria-hidden="true" size={20} weight="fill" />
            <div>
              <strong>如何查看本地凭据</strong>
              <p>在仓库根目录运行：</p>
              <code>corepack pnpm demo:credentials</code>
              <small>命令只会在验证本地演示环境与数据库身份后显示凭据。</small>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
