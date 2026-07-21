"use client";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";
import "./globals.css";

/**
 * Last-resort boundary: catches a throw in the root layout itself, which is the
 * only failure that leaves the app without an `<html>`. It replaces the document
 * (fonts and providers included), so it renders a self-contained screen and
 * links out with a plain anchor rather than the router.
 */
export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en" className="dark antialiased">
      <body className="flex min-h-screen items-center justify-center bg-background p-10 text-foreground">
        <EmptyState
          icon={<TriangleAlert />}
          title="The app ran into a problem"
          description="Reload to try again. If it keeps happening, come back in a little while."
          action={
            <div className="mt-2 flex items-center gap-2">
              <Button variant="outline" onClick={() => reset()}>
                Reload
              </Button>
              <Button nativeButton={false} render={<a href="/" />}>
                Go home
              </Button>
            </div>
          }
        />
      </body>
    </html>
  );
}
