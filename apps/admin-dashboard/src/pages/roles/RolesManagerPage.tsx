import React, { useState, useEffect } from "react";
import { apiClient, Role, Permission } from "@repo/api-client";
import {
  ShieldCheck,
  ShieldAlert,
  Key,
  Plus,
  Edit2,
  UserCheck,
  Search,
  Check,
  Layers,
  Lock,
  RefreshCw,
  Users,
} from "lucide-react";
import { Button, Dialog, DialogContent, DialogTitle, Input, Label, PageHeader, Textarea } from "@repo/ui";

interface RolesManagerPageProps {
  token: string;
}

export const RolesManagerPage: React.FC<RolesManagerPageProps> = ({ token }) => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"roles" | "permissions">("roles");

  // Create Role Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [newRolePermissions, setNewRolePermissions] = useState<string[]>([]);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit Permissions Modal
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [editPermissionsList, setEditPermissionsList] = useState<string[]>([]);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Assign Role Modal
  const [assigningRole, setAssigningRole] = useState<Role | null>(null);
  const [targetUserId, setTargetUserId] = useState("");
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [assignMsg, setAssignMsg] = useState<{ type: "success" | "error"; text: string } | null>(
    null,
  );

  useEffect(() => {
    loadData();
  }, [token]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rolesData, permsData] = await Promise.all([
        apiClient.roles.getRoles(token),
        apiClient.roles.getPermissions(token),
      ]);
      setRoles(rolesData || []);
      setPermissions(permsData?.all || []);
    } catch (err: any) {
      console.error("Failed to load roles and permissions", err);
    } finally {
      setLoading(false);
    }
  };

  // Group permissions by module
  const permissionsByModule = permissions.reduce<Record<string, Permission[]>>((acc, perm) => {
    const mod = perm.module || "GENERAL";
    if (!acc[mod]) acc[mod] = [];
    acc[mod].push(perm);
    return acc;
  }, {});

  const handleOpenEdit = (role: Role) => {
    setEditingRole(role);
    setEditPermissionsList((role.permissions || []).map((p) => p.id));
    setEditError(null);
  };

  const toggleEditPermission = (permId: string) => {
    setEditPermissionsList((prev) =>
      prev.includes(permId) ? prev.filter((id) => id !== permId) : [...prev, permId],
    );
  };

  const toggleModulePermissionsInEdit = (mod: string) => {
    const modPermIds = (permissionsByModule[mod] || []).map((p) => p.id);
    const allSelected = modPermIds.every((id) => editPermissionsList.includes(id));
    if (allSelected) {
      setEditPermissionsList((prev) => prev.filter((id) => !modPermIds.includes(id)));
    } else {
      setEditPermissionsList((prev) => Array.from(new Set([...prev, ...modPermIds])));
    }
  };

  const handleSaveRolePermissions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole) return;
    try {
      setEditSubmitting(true);
      setEditError(null);
      await apiClient.roles.updateRolePermissions(
        editingRole.id,
        editPermissionsList,
        token,
      );
      setEditingRole(null);
      loadData();
    } catch (err: any) {
      setEditError(err?.message || "Failed to update role permissions");
    } finally {
      setEditSubmitting(false);
    }
  };

  const toggleNewPermission = (permId: string) => {
    setNewRolePermissions((prev) =>
      prev.includes(permId) ? prev.filter((id) => id !== permId) : [...prev, permId],
    );
  };

  const toggleModuleInNewRole = (mod: string) => {
    const modPermIds = (permissionsByModule[mod] || []).map((p) => p.id);
    const allSelected = modPermIds.every((id) => newRolePermissions.includes(id));
    if (allSelected) {
      setNewRolePermissions((prev) => prev.filter((id) => !modPermIds.includes(id)));
    } else {
      setNewRolePermissions((prev) => Array.from(new Set([...prev, ...modPermIds])));
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) {
      setCreateError("Role name is required");
      return;
    }
    try {
      setCreateSubmitting(true);
      setCreateError(null);
      await apiClient.roles.createRole(
        {
          name: newRoleName.trim(),
          description: newRoleDescription.trim() || undefined,
          permissionIds: newRolePermissions,
        },
        token,
      );
      setShowCreateModal(false);
      setNewRoleName("");
      setNewRoleDescription("");
      setNewRolePermissions([]);
      loadData();
    } catch (err: any) {
      setCreateError(err?.message || "Failed to create role");
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleAssignRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningRole || !targetUserId.trim()) return;
    try {
      setAssignSubmitting(true);
      setAssignMsg(null);
      await apiClient.roles.assignUserRole(
        targetUserId.trim(),
        assigningRole.id,
        token,
      );
      setAssignMsg({
        type: "success",
        text: `Successfully assigned role "${assigningRole.name}" to user!`,
      });
      setTimeout(() => {
        setAssigningRole(null);
        setTargetUserId("");
        setAssignMsg(null);
      }, 1500);
    } catch (err: any) {
      setAssignMsg({
        type: "error",
        text: err?.message || "Failed to assign role to user",
      });
    } finally {
      setAssignSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Roles & Granular RBAC Governance"
        description="Dynamic access control engine, capability matrix, and staff authorization management"
        actions={
          <>
            <div className="flex items-center gap-3">
              <button
                onClick={loadData}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-input text-xs font-semibold text-slate-700 hover:bg-muted transition-colors shadow-xs"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </button>
              <button
                onClick={() => {
                  setShowCreateModal(true);
                  setNewRoleName("");
                  setNewRoleDescription("");
                  setNewRolePermissions([]);
                  setCreateError(null);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-xs transition-colors"
              >
                <Plus className="h-4 w-4" />
                Create Custom Role
              </button>
            </div>
          </>
        }
      />

      {/* Tabs */}
      <div className="flex bg-slate-200/80 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab("roles")}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "roles"
              ? "bg-card text-foreground shadow-xs"
              : "text-slate-600 hover:text-foreground"
          }`}
        >
          System & Custom Roles ({roles.length})
        </button>
        <button
          onClick={() => setActiveTab("permissions")}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "permissions"
              ? "bg-card text-foreground shadow-xs"
              : "text-slate-600 hover:text-foreground"
          }`}
        >
          Granular Permissions Registry ({permissions.length})
        </button>
      </div>

      {loading ? (
        <div className="p-16 text-center text-slate-400">Loading security catalog...</div>
      ) : activeTab === "roles" ? (
        /* Roles Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roles.map((role) => (
            <div
              key={role.id}
              className="bg-card rounded-xl border border-border p-6 flex flex-col justify-between shadow-xs hover:border-input transition-all"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-9 w-9 rounded-xl flex items-center justify-center ${
                        role.isSystemRole
                          ? "bg-primary/5 text-primary"
                          : "bg-sky-50 text-sky-600"
                      }`}
                    >
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground text-base">{role.name}</h3>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {(role.permissions || []).length} capabilities granted
                      </span>
                    </div>
                  </div>

                  {role.isSystemRole ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-muted text-slate-700 border border-border">
                      System
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-sky-100 text-sky-700 border border-sky-200">
                      Custom
                    </span>
                  )}
                </div>

                <p className="text-xs text-muted-foreground mb-4 min-h-[32px]">
                  {role.description || "No custom description provided for this operational role."}
                </p>

                {/* Capability tags snippet */}
                <div className="flex flex-wrap gap-1.5 mb-6">
                  {(role.permissions || []).slice(0, 4).map((p) => (
                    <span
                      key={p.id}
                      className="px-2 py-0.5 rounded bg-muted/50 border border-border text-[10px] font-mono text-slate-600"
                    >
                      {p.slug}
                    </span>
                  ))}
                  {(role.permissions || []).length > 4 && (
                    <span className="px-2 py-0.5 rounded bg-muted/50 border border-border text-[10px] font-mono text-slate-400">
                      +{(role.permissions || []).length - 4} more
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleOpenEdit(role)}
                  className="flex-1 py-1.5 px-3 rounded-lg border border-border hover:bg-muted/50 text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  Edit Permissions
                </button>
                <button
                  onClick={() => {
                    setAssigningRole(role);
                    setTargetUserId("");
                    setAssignMsg(null);
                  }}
                  className="py-1.5 px-3 rounded-lg bg-primary/5 hover:bg-primary/10 text-xs font-semibold text-primary flex items-center justify-center gap-1.5 transition-colors"
                >
                  <UserCheck className="h-3.5 w-3.5" />
                  Assign
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Permissions Catalog grouped by module */
        <div className="space-y-6">
          {Object.entries(permissionsByModule).map(([moduleName, perms]) => (
            <div
              key={moduleName}
              className="bg-card rounded-xl border border-border overflow-hidden shadow-xs"
            >
              <div className="px-6 py-4 bg-muted/50 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  <h3 className="font-bold text-foreground text-sm tracking-wide uppercase">
                    {moduleName} Module
                  </h3>
                </div>
                <span className="text-xs text-muted-foreground font-medium">
                  {perms.length} Permissions Defined
                </span>
              </div>

              <div className="divide-y divide-border/60">
                {perms.map((perm) => (
                  <div
                    key={perm.id}
                    className="px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-muted/50/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-7 rounded-lg bg-muted text-slate-600 flex items-center justify-center">
                        <Key className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <div className="font-mono text-xs font-bold text-foreground">
                          {perm.slug}
                        </div>
                        <div className="text-xs text-muted-foreground">{perm.name} {perm.description ? `— ${perm.description}` : ""}</div>
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      Scope: {perm.module.toLowerCase()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Role Permissions Modal */}
      <Dialog open={!!editingRole} onOpenChange={(open) => !open && setEditingRole(null)}>
        <DialogContent hideClose aria-describedby={undefined} className="max-w-2xl gap-0 overflow-visible border-0 bg-transparent p-0 shadow-none">
            {editingRole && (
            <>
          <DialogTitle className="sr-only">Edit Role Permissions</DialogTitle>
          <div className="bg-card rounded-xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-lg">
                    Edit Role Permissions: {editingRole.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Select granular privileges granted to users holding this role
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/5 text-primary">
                {editPermissionsList.length} Selected
              </span>
            </div>

            {editError && (
              <div className="mt-4 p-3 rounded-lg bg-destructive/5 border border-destructive/20 text-xs text-destructive">
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveRolePermissions} className="flex-1 overflow-y-auto py-4 space-y-6">
              {Object.entries(permissionsByModule).map(([moduleName, perms]) => {
                const allSelected = perms.every((p) => editPermissionsList.includes(p.id));
                return (
                  <div key={moduleName} className="border border-border rounded-xl p-4">
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                      <span className="font-bold text-xs uppercase tracking-wider text-slate-800">
                        {moduleName}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleModulePermissionsInEdit(moduleName)}
                        className="text-xs font-semibold text-primary hover:text-primary"
                      >
                        {allSelected ? "Deselect All" : "Select All"}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {perms.map((p) => {
                        const checked = editPermissionsList.includes(p.id);
                        return (
                          <Label
                            key={p.id}
                            className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition-colors ${
                              checked
                                ? "bg-primary/50 border-primary/20"
                                : "hover:bg-muted/50 border-border"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleEditPermission(p.id)}
                              className="mt-0.5 rounded text-primary focus:ring-ring"
                            />
                            <div>
                              <div className="font-mono text-xs font-semibold text-foreground">
                                {p.slug}
                              </div>
                              <div className="text-[11px] text-muted-foreground">{p.name}</div>
                            </div>
                          </Label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              <div className="sticky bottom-0 bg-card pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingRole(null)}
                  disabled={editSubmitting}
                  className="px-4 py-2 rounded-lg border border-input text-xs font-semibold text-slate-600 hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-4 py-2 rounded-lg bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90 shadow-sm"
                >
                  {editSubmitting ? "Saving..." : "Save Role Permissions"}
                </button>
              </div>
            </form>
          </div>
            </>
            )}
        </DialogContent>
      </Dialog>

      {/* Create Custom Role Modal */}
      <Dialog open={!!showCreateModal} onOpenChange={(open) => !open && setShowCreateModal(false)}>
        <DialogContent hideClose aria-describedby={undefined} className="max-w-2xl gap-0 overflow-visible border-0 bg-transparent p-0 shadow-none">
          <DialogTitle className="sr-only">Create Custom Role</DialogTitle>
          <div className="bg-card rounded-xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-lg">Create Custom Security Role</h3>
                  <p className="text-xs text-muted-foreground">Define tailored permissions for your operational staff</p>
                </div>
              </div>
            </div>

            {createError && (
              <div className="mt-4 p-3 rounded-lg bg-destructive/5 border border-destructive/20 text-xs text-destructive">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateRole} className="flex-1 overflow-y-auto py-4 space-y-5">
              <div>
                <Label className="block text-xs font-semibold text-slate-700 mb-1">Role Name *</Label>
                <Input
                  type="text"
                  required
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="e.g. Warehouse Dispatch Lead"
                  className="w-full text-sm"
                />
              </div>

              <div>
                <Label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </Label>
                <Textarea
                  rows={2}
                  value={newRoleDescription}
                  onChange={(e) => setNewRoleDescription(e.target.value)}
                  placeholder="Describe scope of responsibility and delegated authorities..."
                  className="w-full text-sm"
                />
              </div>

              <div className="space-y-4">
                <Label className="block text-xs font-semibold text-slate-700">
                  Assign Capabilities ({newRolePermissions.length} selected)
                </Label>

                {Object.entries(permissionsByModule).map(([moduleName, perms]) => {
                  const allSelected = perms.every((p) => newRolePermissions.includes(p.id));
                  return (
                    <div key={moduleName} className="border border-border rounded-xl p-4">
                      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                        <span className="font-bold text-xs uppercase tracking-wider text-slate-800">
                          {moduleName}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleModuleInNewRole(moduleName)}
                          className="text-xs font-semibold text-sky-600 hover:text-sky-800"
                        >
                          {allSelected ? "Deselect All" : "Select All"}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {perms.map((p) => {
                          const checked = newRolePermissions.includes(p.id);
                          return (
                            <Label
                              key={p.id}
                              className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition-colors ${
                                checked
                                  ? "bg-sky-50/50 border-sky-200"
                                  : "hover:bg-muted/50 border-border"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleNewPermission(p.id)}
                                className="mt-0.5 rounded text-sky-600 focus:ring-sky-500"
                              />
                              <div>
                                <div className="font-mono text-xs font-semibold text-foreground">
                                  {p.slug}
                                </div>
                                <div className="text-[11px] text-muted-foreground">{p.name}</div>
                              </div>
                            </Label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="sticky bottom-0 bg-card pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={createSubmitting}
                  className="px-4 py-2 rounded-lg border border-input text-xs font-semibold text-slate-600 hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="px-4 py-2 rounded-lg bg-sky-600 text-xs font-semibold text-white hover:bg-sky-700 shadow-sm"
                >
                  {createSubmitting ? "Creating..." : "Create Custom Role"}
                </button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Role to User Modal */}
      <Dialog open={!!assigningRole} onOpenChange={(open) => !open && setAssigningRole(null)}>
        <DialogContent hideClose aria-describedby={undefined} className="max-w-md gap-0 overflow-visible border-0 bg-transparent p-0 shadow-none">
            {assigningRole && (
            <>
          <DialogTitle className="sr-only">Assign Role to User</DialogTitle>
          <div className="bg-card rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-lg">Assign Role to User</h3>
                <p className="text-xs text-muted-foreground">Role: {assigningRole.name}</p>
              </div>
            </div>

            {assignMsg && (
              <div
                className={`p-3 rounded-lg text-xs ${
                  assignMsg.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-destructive/5 text-red-800 border border-destructive/20"
                }`}
              >
                {assignMsg.text}
              </div>
            )}

            <form onSubmit={handleAssignRole} className="space-y-4">
              <div>
                <Label className="block text-xs font-semibold text-slate-700 mb-1">
                  User ID (UUID) *
                </Label>
                <Input
                  type="text"
                  required
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  placeholder="Enter User UUID to grant role..."
                  className="w-full text-sm font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAssigningRole(null)}
                  disabled={assignSubmitting}
                  className="px-4 py-2 rounded-lg border border-input text-xs font-semibold text-slate-600 hover:bg-muted"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={assignSubmitting}
                  className="px-4 py-2 rounded-lg bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90 shadow-sm"
                >
                  {assignSubmitting ? "Assigning..." : "Grant Role Assignment"}
                </button>
              </div>
            </form>
          </div>
            </>
            )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
