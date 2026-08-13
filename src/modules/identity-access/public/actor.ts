import type { AppRole } from "@/src/modules/identity-access/public/permissions";

export type AdminActor = {
  id: string;
  name: string;
  role: AppRole;
};
