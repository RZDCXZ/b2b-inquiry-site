export function InquiryStatus({
  status,
}: {
  status: "assigned" | "pending_assignment";
}) {
  const pending = status === "pending_assignment";

  return (
    <span
      className={`inquiry-status ${pending ? "is-pending" : "is-assigned"}`}
    >
      <i /> {pending ? "待分配" : "已分配"}
    </span>
  );
}
