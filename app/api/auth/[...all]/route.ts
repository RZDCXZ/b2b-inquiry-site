import { auth } from "@/src/modules/identity-access/server/auth";
import { auditLoginResponse } from "@/src/modules/identity-access/server/audit";

export async function GET(request: Request): Promise<Response> {
  return auth.handler(request);
}

export async function POST(request: Request): Promise<Response> {
  const isEmailLogin = new URL(request.url).pathname.endsWith("/sign-in/email");
  const response = await auth.handler(request);

  if (isEmailLogin) {
    await auditLoginResponse(response);
  }

  return response;
}
