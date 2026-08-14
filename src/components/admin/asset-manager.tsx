"use client";

import {
  CheckCircle,
  FileArrowUp,
  FilePdf,
  ImageSquare,
  LinkSimple,
  Trash,
  XCircle,
} from "@phosphor-icons/react";
import Image from "next/image";
import { useActionState, useEffect, useRef, useState } from "react";

import {
  deleteAssetAction,
  uploadAssetAction,
  type AssetMutationState,
} from "@/app/admin/(protected)/assets/actions";
import type { AssetReference } from "@/src/application/asset-management";
import { productImageSource } from "@/src/components/product-image-source";

const initialState: AssetMutationState = { message: "", status: "idle" };

export type AssetManagerAsset = {
  byteSize: number;
  createdAt: string;
  id: string;
  imageAltEn: string | null;
  imageAltZhCn: string | null;
  kind: "document" | "image";
  mimeType: string;
  originalFilename: string;
  publicPath: string;
  references: AssetReference[];
  source: "generated" | "uploaded";
};

function Feedback({ state }: { state: AssetMutationState }) {
  const feedbackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.status !== "idle") {
      feedbackRef.current?.focus();
    }
  }, [state]);

  if (state.status === "idle") {
    return null;
  }

  return (
    <div
      className={`asset-feedback is-${state.status}`}
      ref={feedbackRef}
      role={state.status === "error" ? "alert" : "status"}
      tabIndex={-1}
    >
      {state.status === "success" ? (
        <CheckCircle aria-hidden="true" weight="fill" />
      ) : (
        <XCircle aria-hidden="true" weight="fill" />
      )}
      <div>
        <strong>{state.message}</strong>
        {state.references?.map((reference) => (
          <span
            key={`${reference.partNumber}-${reference.publicationId ?? "draft"}-${reference.usage}`}
          >
            {reference.partNumber} ·{" "}
            {reference.usage === "image" ? "图片" : "资料"}
            {reference.version
              ? ` · 发布版本 v${reference.version}`
              : " · 当前草稿"}
            {reference.current ? " · 当前公开" : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

function DeleteAssetControl({ asset }: { asset: AssetManagerAsset }) {
  const [state, action, pending] = useActionState(
    deleteAssetAction,
    initialState,
  );
  const protectedByReference = asset.references.length > 0;
  const disabled =
    pending || asset.source === "generated" || protectedByReference;

  return (
    <div className="asset-delete-control">
      <form
        action={action}
        onSubmit={(event) => {
          if (
            !window.confirm(
              `确认永久删除素材“${asset.originalFilename}”吗？文件与素材记录都会删除，且无法恢复。`,
            )
          ) {
            event.preventDefault();
          }
        }}
      >
        <input name="assetId" type="hidden" value={asset.id} />
        <button className="admin-danger-button" disabled={disabled}>
          <Trash aria-hidden="true" />
          {pending ? "删除中…" : "删除素材"}
        </button>
      </form>
      {asset.source === "generated" ? (
        <small>标准生成素材由演示重置恢复。</small>
      ) : protectedByReference ? (
        <small>存在引用，不能直接删除。</small>
      ) : null}
      <Feedback state={state} />
    </div>
  );
}

export function AssetManager({ assets }: { assets: AssetManagerAsset[] }) {
  const [kind, setKind] = useState<"document" | "image">("image");
  const [state, action, pending] = useActionState(
    uploadAssetAction,
    initialState,
  );

  return (
    <>
      <section className="admin-section asset-upload-panel">
        <div className="asset-upload-contract">
          <p>上传安全合同</p>
          <h2>类型、签名与体积同时通过才会写入</h2>
          <ul>
            <li>图片：JPEG、PNG、WebP，最大 5 MiB</li>
            <li>资料：PDF，最大 10 MiB</li>
            <li>本地文件名由系统随机生成，不使用原文件路径</li>
          </ul>
        </div>
        <form action={action} className="asset-upload-form">
          <label>
            <span>素材类型</span>
            <select
              name="kind"
              onChange={(event) =>
                setKind(event.target.value as "document" | "image")
              }
              value={kind}
            >
              <option value="image">产品图片</option>
              <option value="document">PDF 产品资料</option>
            </select>
          </label>
          <label>
            <span>选择文件</span>
            <input
              accept={
                kind === "image"
                  ? "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                  : "application/pdf,.pdf"
              }
              name="file"
              required
              type="file"
            />
          </label>
          <label hidden={kind !== "image"}>
            <span>English alternative text</span>
            <input name="imageAltEn" required={kind === "image"} />
          </label>
          <label hidden={kind !== "image"}>
            <span>中文替代文本</span>
            <input name="imageAltZhCn" required={kind === "image"} />
          </label>
          <button className="admin-primary-button" disabled={pending}>
            <FileArrowUp aria-hidden="true" />
            {pending ? "校验并上传中…" : "校验并创建素材"}
          </button>
          <Feedback state={state} />
        </form>
      </section>

      <section className="asset-library" aria-label="素材库">
        {assets.map((asset) => (
          <article className="admin-section asset-card" key={asset.id}>
            <div className="asset-card-preview">
              {asset.kind === "image" ? (
                <Image
                  alt={asset.imageAltZhCn ?? asset.originalFilename}
                  fill
                  sizes="220px"
                  src={productImageSource(asset.publicPath)}
                />
              ) : (
                <FilePdf aria-hidden="true" size={54} weight="thin" />
              )}
            </div>
            <div className="asset-card-copy">
              <p>
                {asset.kind === "image" ? (
                  <ImageSquare aria-hidden="true" />
                ) : (
                  <FilePdf aria-hidden="true" />
                )}
                {asset.kind === "image" ? "图片" : "PDF 资料"} ·{" "}
                {asset.source === "generated" ? "标准生成" : "本地上传"}
              </p>
              <h2>{asset.originalFilename}</h2>
              <dl>
                <div>
                  <dt>类型 / 体积</dt>
                  <dd>
                    {asset.mimeType} · {(asset.byteSize / 1024).toFixed(1)} KiB
                  </dd>
                </div>
                <div>
                  <dt>创建时间</dt>
                  <dd>
                    {new Date(asset.createdAt).toLocaleString("zh-CN", {
                      timeZone: "Asia/Shanghai",
                    })}
                  </dd>
                </div>
                {asset.kind === "image" ? (
                  <div>
                    <dt>中英文替代文本</dt>
                    <dd>
                      {asset.imageAltZhCn} / {asset.imageAltEn}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </div>
            <div className="asset-reference-list">
              <p>
                <LinkSimple aria-hidden="true" /> 引用内容
              </p>
              {asset.references.length === 0 ? (
                <span>尚未引用</span>
              ) : (
                asset.references.map((reference) => (
                  <span
                    key={`${reference.partNumber}-${reference.publicationId ?? "draft"}-${reference.usage}`}
                  >
                    <strong>{reference.partNumber}</strong>
                    {reference.version
                      ? `发布版本 v${reference.version}`
                      : "当前草稿"}
                    {reference.current ? " · 当前公开" : ""}
                  </span>
                ))
              )}
            </div>
            <DeleteAssetControl asset={asset} />
          </article>
        ))}
      </section>
    </>
  );
}
