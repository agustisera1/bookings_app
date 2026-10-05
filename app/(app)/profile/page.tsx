import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ChartNoAxesColumn, Hash, Mail, User } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { ROLE_DESCRIPTIONS, ROLE_LABELS, type Role } from "@/lib/auth/policy";
import { initialsFrom } from "@/lib/shared/utils";
import { PageLayout } from "@/components/common/page-layout";
import { DetailColumns } from "@/components/common/detail-columns";
import { Section } from "@/components/common/section";
import { EmptyState } from "@/components/common/empty-state";
import { Fact } from "@/components/common/fact";
import { CopyButton } from "@/components/common/copy-button";
import { InitialsAvatar } from "@/components/common/initials-avatar";
import CreateListing from "@/components/listings/create-listing/create-listing";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Profile" };

const ROLE_BADGE_VARIANTS: Record<Role, "primary" | "secondary"> = {
  guest: "secondary",
  host: "primary",
};

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) redirect("/auth/sign-in");

  return (
    <PageLayout
      title="Profile"
      subtitle="Your account and the roles it carries."
      actions={user.is_host && <CreateListing />}
    >
      <div className="flex flex-col gap-8">
        <Card>
          <CardContent className="flex items-center gap-4">
            <InitialsAvatar initials={initialsFrom(user.name)} size="lg" />
            <div className="flex min-w-0 flex-col gap-1">
              <p className="font-heading text-xl font-semibold">{user.name}</p>
              <p className="truncate text-sm text-muted-foreground">
                {user.email}
              </p>
            </div>
          </CardContent>
        </Card>

        <DetailColumns
          aside={
            <Section title="Roles" card>
              <ul className="flex flex-col gap-4">
                {user.roles.map((role) => (
                  <li key={role} className="flex flex-col gap-1.5">
                    <Badge variant={ROLE_BADGE_VARIANTS[role]}>
                      {ROLE_LABELS[role]}
                    </Badge>
                    <p className="text-sm text-muted-foreground">
                      {ROLE_DESCRIPTIONS[role]}
                    </p>
                  </li>
                ))}
              </ul>
            </Section>
          }
        >
          <Section title="Account details" card>
            <dl className="grid gap-6 sm:grid-cols-2">
              <Fact icon={<User />} label="Name" value={user.name} />
              <Fact
                icon={<Mail />}
                label="Email"
                value={
                  <span className="flex items-start gap-1">
                    <span className="break-all">{user.email}</span>
                    <CopyButton value={user.email} label="Copy email" />
                  </span>
                }
              />
              <Fact
                icon={<Hash />}
                label="Account ID"
                value={
                  <span className="flex items-start gap-1">
                    <span className="font-mono text-xs break-all">
                      {user.id}
                    </span>
                    <CopyButton value={user.id} label="Copy account ID" />
                  </span>
                }
                note="Quote this when reporting an issue."
              />
            </dl>
          </Section>

          <Section
            title="Metrics"
            subtitle="How your account is doing at a glance."
            card
          >
            <EmptyState
              className="py-10"
              icon={<ChartNoAxesColumn />}
              title="Coming soon"
              description="Bookings, listings and review stats will show up here."
            />
          </Section>
        </DetailColumns>
      </div>
    </PageLayout>
  );
}
