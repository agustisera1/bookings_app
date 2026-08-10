import { redirect } from "next/navigation";
import { ChartNoAxesColumn, Hash, Mail, User } from "lucide-react";
import { getCurrentUser } from "@/lib/services/auth";
import {
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  type Role,
} from "@/lib/permissions";
import { initialsFrom } from "@/lib/utils";
import { PageLayout } from "@/components/common/page-layout";
import { Section } from "@/components/common/section";
import { EmptyState } from "@/components/common/empty-state";
import { Fact } from "@/components/common/fact";
import { CopyButton } from "@/components/common/copy-button";
import { CreateListingButton } from "@/components/listings/create-listing/create-listing-button";
import { Badge } from "@/components/ui/badge";

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
      actions={user.is_host && <CreateListingButton />}
    >
      <div className="flex flex-col gap-8">
        <div className="flex items-center gap-4 rounded-xl bg-card p-6 ring-1 ring-foreground/10">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-success text-xl font-semibold text-success-foreground">
            {initialsFrom(user.name)}
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <p className="font-heading text-xl font-semibold">{user.name}</p>
            <p className="truncate text-sm text-muted-foreground">
              {user.email}
            </p>
          </div>
        </div>

        <div className="grid items-start gap-8 lg:grid-cols-[1.6fr_1fr]">
          <div className="flex flex-col gap-8">
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
          </div>

          <aside className="flex flex-col gap-8 lg:sticky lg:top-32">
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
          </aside>
        </div>
      </div>
    </PageLayout>
  );
}
