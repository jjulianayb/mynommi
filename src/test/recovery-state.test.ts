import { beforeEach, expect, it, vi } from "vitest";
beforeEach(() => { vi.resetModules(); history.replaceState(null, "", "/recuperar-senha"); });
it("lembra o retorno depois de o cliente limpar o token da URL", async () => {
  history.replaceState(null, "", "/recuperar-senha#access_token=teste&type=recovery");
  const r = await import("@/lib/recovery-state");
  r.captureRecoveryReturn();
  history.replaceState(null, "", "/recuperar-senha#");
  expect(r.hasRecoveryReturn()).toBe(true);
});
it("não trata um login comum como recuperação", async () => {
  const r = await import("@/lib/recovery-state");
  r.captureRecoveryReturn();
  expect(r.hasRecoveryReturn()).toBe(false);
});
