"use client";

import Link from "next/link";
import { ArrowLeft, ShieldCheck, UsersRound } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Heading, Text } from "@/components/ui/typography";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ReactNode } from "react";

interface TopbarProps {
  heading?: string;
  subheading?: string;
  headingAccessory?: ReactNode;
  backHref?: string;
  onBack?: () => void;
  viewRole?: 'admin' | 'manager';
  action?: ReactNode;
}

export default function Topbar({ heading, subheading, headingAccessory, backHref, onBack, viewRole, action }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center gap-3 border-b border-border/60 bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:backdrop-blur sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        {backHref && (
          <Button asChild variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <Link href={backHref}>
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Link>
          </Button>
        )}
        {!backHref && onBack && (
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Button>
        )}
        {(heading || subheading) && (
          <div className="flex min-w-0 flex-col justify-center gap-0.5">
            <div className="flex min-w-0 items-center gap-2">
              {heading && (
                <Heading as="h1" size="lg" className="m-0 min-w-0 truncate leading-tight" weight="semibold">
                  {heading}
                </Heading>
              )}
              {headingAccessory}
            </div>
            {subheading && (
              <Text
                as="div"
                size="xs"
                tone="muted"
                className="m-0 truncate leading-tight"
              >
                {subheading}
              </Text>
            )}
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {action}
        {viewRole && (
          <Badge
            variant="outline"
            className="gap-1.5 whitespace-nowrap border-border bg-muted/50 px-2 py-1 text-[11px] font-medium text-foreground"
            aria-label={`Current view: ${viewRole === 'admin' ? 'Admin' : 'Regional manager'}`}
          >
            {viewRole === 'admin' ? (
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <UsersRound className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {viewRole === 'admin' ? 'Admin view' : 'Regional manager view'}
          </Badge>
        )}
        <ThemeToggle />
      </div>
    </header>
  );
}
