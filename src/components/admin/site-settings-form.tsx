"use client";

import {
  CheckCircle,
  FloppyDisk,
  LockKey,
  XCircle,
} from "@phosphor-icons/react";
import { useActionState } from "react";

import {
  saveSiteConfigurationAction,
  type SettingsMutationState,
} from "@/app/admin/(protected)/settings/actions";

const initialState: SettingsMutationState = { message: "", status: "idle" };

export function SiteSettingsForm({
  settings,
}: {
  settings: {
    addressEn: string;
    addressZhCn: string;
    companyNameEn: string;
    companyNameZhCn: string;
    contactEmail: string;
    contactPhone: string;
    defaultSeoDescriptionEn: string;
    defaultSeoDescriptionZhCn: string;
    defaultSeoTitleEn: string;
    defaultSeoTitleZhCn: string;
    lastModifiedAt: string;
    lastModifiedBy: string;
    notificationRecipientRoles: string[];
    socialLinks: Record<string, string>;
    version: number;
  };
}) {
  const [state, action, pending] = useActionState(
    saveSiteConfigurationAction,
    initialState,
  );
  const currentVersion = state.version ?? settings.version;
  return (
    <form action={action} className="site-settings-form admin-section">
      <input name="expectedVersion" type="hidden" value={currentVersion} />
      <fieldset>
        <legend>企业身份与联系信息</legend>
        <label>
          <span>企业中文名称</span>
          <input
            defaultValue={settings.companyNameZhCn}
            name="companyNameZhCn"
          />
        </label>
        <label>
          <span>Company name</span>
          <input defaultValue={settings.companyNameEn} name="companyNameEn" />
        </label>
        <label>
          <span>联系邮箱</span>
          <input
            defaultValue={settings.contactEmail}
            name="contactEmail"
            type="email"
          />
        </label>
        <label>
          <span>联系电话</span>
          <input defaultValue={settings.contactPhone} name="contactPhone" />
        </label>
        <label>
          <span>中文地址</span>
          <textarea
            defaultValue={settings.addressZhCn}
            name="addressZhCn"
            rows={3}
          />
        </label>
        <label>
          <span>English address</span>
          <textarea
            defaultValue={settings.addressEn}
            name="addressEn"
            rows={3}
          />
        </label>
      </fieldset>
      <fieldset>
        <legend>默认 SEO</legend>
        <label>
          <span>中文默认标题</span>
          <input
            defaultValue={settings.defaultSeoTitleZhCn}
            name="defaultSeoTitleZhCn"
          />
        </label>
        <label>
          <span>English default title</span>
          <input
            defaultValue={settings.defaultSeoTitleEn}
            name="defaultSeoTitleEn"
          />
        </label>
        <label>
          <span>中文默认描述</span>
          <textarea
            defaultValue={settings.defaultSeoDescriptionZhCn}
            name="defaultSeoDescriptionZhCn"
            rows={3}
          />
        </label>
        <label>
          <span>English default description</span>
          <textarea
            defaultValue={settings.defaultSeoDescriptionEn}
            name="defaultSeoDescriptionEn"
            rows={3}
          />
        </label>
      </fieldset>
      <fieldset>
        <legend>社交链接与模拟通知</legend>
        <label className="is-wide">
          <span>社交链接（每行“名称 | https://地址”）</span>
          <textarea
            defaultValue={Object.entries(settings.socialLinks)
              .map(([label, href]) => `${label} | ${href}`)
              .join("\n")}
            name="socialLinks"
            rows={4}
          />
        </label>
        <div className="settings-role-checks">
          <span>模拟通知收件角色</span>
          {[
            ["administrator", "管理员"],
            ["content_editor", "内容编辑"],
            ["sales", "业务人员"],
          ].map(([value, label]) => (
            <label key={value}>
              <input
                defaultChecked={settings.notificationRecipientRoles.includes(
                  value,
                )}
                name="notificationRecipientRoles"
                type="checkbox"
                value={value}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <aside className="settings-environment-boundary">
        <LockKey />
        <div>
          <strong>后台没有安全配置入口</strong>
          <p>
            索引模式、数据库地址、会话密钥和其他环境安全配置只由环境与 CLI
            控制；本页面不展示具体秘密值。
          </p>
        </div>
      </aside>
      {state.status !== "idle" ? (
        <div
          className={`content-feedback is-${state.status}`}
          role={state.status === "error" ? "alert" : "status"}
        >
          {state.status === "success" ? (
            <CheckCircle weight="fill" />
          ) : (
            <XCircle weight="fill" />
          )}
          <div>
            <strong>{state.message}</strong>
            {state.conflict ? (
              <p>
                最新修改：{state.conflict.latestModifiedBy} ·{" "}
                {new Date(state.conflict.latestModifiedAt).toLocaleString(
                  "zh-CN",
                  { timeZone: "Asia/Shanghai" },
                )}
              </p>
            ) : null}
            {state.fieldErrors ? (
              <ul>
                {Object.entries(state.fieldErrors).map(([field, message]) => (
                  <li key={field}>
                    {field}：{message}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      ) : null}
      <footer>
        <span>
          最后保存：{settings.lastModifiedBy} ·{" "}
          {new Date(settings.lastModifiedAt).toLocaleString("zh-CN", {
            timeZone: "Asia/Shanghai",
          })}
        </span>
        <button className="admin-primary-button" disabled={pending}>
          <FloppyDisk />
          {pending ? "保存中…" : "保存站点配置"}
        </button>
      </footer>
    </form>
  );
}
