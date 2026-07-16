import { getCurrentUser } from "@/lib/services/auth";
import { ROLE_LABELS, ROLE_PERMISSIONS, type Role } from "@/lib/permissions";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PermissionButton } from "./permission-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const ROLE_BADGE_VARIANTS: Record<Role, "primary" | "secondary" | "outline"> =
  {
    guest: "secondary",
    host: "primary",
  };

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) redirect("/auth/sign-in");

  return (
    <div className="flex justify-center px-4 py-10">
      <div className="w-full max-w-xl flex flex-col gap-6">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-semibold shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold text-base">{user.name}</span>
              <span className="text-muted-foreground text-sm">{user.email}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Roles
            </CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            {user.roles.map((role) => (
              <Badge key={role} variant={ROLE_BADGE_VARIANTS[role]}>
                {ROLE_LABELS[role]}
              </Badge>
            ))}
          </CardContent>
        </Card>

        {user.is_host && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Listings
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Manage your existing listings or publish a new one.
              </p>
              <div className="flex gap-2 shrink-0">
                <Button
                  variant="outline"
                  nativeButton={false}
                  render={<Link href="/listings/mine" />}
                >
                  My listings
                </Button>
                <Button
                  nativeButton={false}
                  render={<Link href="/listings/new" />}
                >
                  Add new listing
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {(Object.keys(ROLE_PERMISSIONS) as Role[]).map((role) => (
          <Card key={role}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Permisos — {ROLE_LABELS[role]}
                </CardTitle>
                {!user.roles.includes(role) && (
                  <span className="text-[10px] text-muted-foreground italic">
                    fuera de scope
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col">
                {ROLE_PERMISSIONS[role].map((permission, i) => (
                  <li key={permission.key}>
                    {i > 0 && <Separator className="my-3" />}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium">
                          {permission.label}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {permission.description}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        {permission.phase && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0"
                          >
                            {permission.phase}
                          </Badge>
                        )}
                        <PermissionButton permissionKey={permission.key} />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
