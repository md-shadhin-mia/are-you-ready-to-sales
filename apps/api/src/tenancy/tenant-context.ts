import { Injectable, Scope } from "@nestjs/common";
import { Store } from "@repo/db";

@Injectable({ scope: Scope.REQUEST })
export class TenantContext {
  private tenant: Store | null = null;

  setTenant(store: Store | null) {
    this.tenant = store;
  }

  getTenant(): Store | null {
    return this.tenant;
  }

  getStoreId(): string | null {
    return this.tenant?.id || null;
  }
}
