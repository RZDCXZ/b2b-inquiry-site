import { CheckCircle, XCircle } from "@phosphor-icons/react";

type MutationFeedbackState = {
  conflict?: {
    latestModifiedAt: string;
    latestModifiedBy: string;
  };
  fieldErrors?: Record<string, string>;
  message: string;
  status: "error" | "idle" | "success";
};

export function MutationFeedback({
  fieldTarget = (field) => field,
  state,
}: {
  fieldTarget?: (field: string) => string | undefined;
  state: MutationFeedbackState;
}) {
  if (state.status === "idle") return null;
  return (
    <div
      autoFocus={state.status === "error"}
      className={`content-feedback is-${state.status}`}
      role={state.status === "error" ? "alert" : "status"}
      tabIndex={state.status === "error" ? -1 : undefined}
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
            {new Date(state.conflict.latestModifiedAt).toLocaleString("zh-CN", {
              timeZone: "Asia/Shanghai",
            })}
          </p>
        ) : null}
        {state.fieldErrors ? (
          <ul>
            {Object.entries(state.fieldErrors).map(([field, message]) => {
              const target = fieldTarget(field);
              return (
                <li key={field}>
                  {target ? <a href={`#${target}`}>{field}</a> : field}：
                  {message}
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
