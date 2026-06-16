import { getCurrentUser } from "@/lib/services/auth";
import { ROLE_LABELS, ROLE_PERMISSIONS, type Role } from "@/lib/permissions";
import { PERMISSION_ACTIONS } from "@/lib/services/permission-map";
import { redirect } from "next/navigation";
import LogoutButton from "./logout-button";
import { PermissionButton } from "./permission-button";

const ROLE_BADGE_STYLES: Record<Role, string> = {
  guest: "bg-gray-700 text-gray-300",
  host: "bg-blue-700 text-blue-100",
  admin: "bg-purple-700 text-purple-100",
};

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) redirect("/auth/sign-in");

  return (
    <div className="w-full max-w-xl flex flex-col gap-6">
      <nav className="flex justify-end">
        <LogoutButton />
      </nav>
      <div className="bg-gray-900 rounded-md p-6 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-gray-700 flex items-center justify-center text-white text-xl font-semibold">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-white font-semibold text-base">
            {user.name}
          </span>
          <span className="text-gray-400 text-sm">{user.email}</span>
        </div>
      </div>

      <div className="bg-gray-900 rounded-md p-6 flex flex-col gap-3">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Roles
        </h2>
        <div className="flex gap-2">
          {user.roles.map((role) => (
            <span
              key={role}
              className={`text-xs px-3 py-1 rounded-full ${ROLE_BADGE_STYLES[role]}`}
            >
              {ROLE_LABELS[role]}
            </span>
          ))}
        </div>
      </div>

      {(Object.keys(ROLE_PERMISSIONS) as Role[]).map((role) => (
        <div
          key={role}
          className="bg-gray-900 rounded-md p-6 flex flex-col gap-3"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Permisos — {ROLE_LABELS[role]}
            </h2>
            {!user.roles.includes(role) && (
              <span className="text-[10px] text-gray-600 italic">
                fuera de scope
              </span>
            )}
          </div>
          <ul className="flex flex-col gap-3">
            {ROLE_PERMISSIONS[role].map((permission) => (
              <li
                key={permission.key}
                className="flex items-start justify-between gap-3"
              >
                <div className="flex flex-col">
                  <span className="text-white text-sm font-medium">
                    {permission.label}
                  </span>
                  <span className="text-gray-400 text-xs">
                    {permission.description}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[10px] text-gray-500">
                    {permission.ref}
                  </span>
                  {permission.phase && (
                    <span className="text-[10px] bg-amber-700 text-amber-100 px-2 py-0.5 rounded-full">
                      {permission.phase}
                    </span>
                  )}
                  <PermissionButton
                    action={PERMISSION_ACTIONS[permission.key]}
                    permissionKey={permission.key}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
