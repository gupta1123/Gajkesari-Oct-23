"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { Heading, Text } from "@/components/ui/typography";

interface TopbarProps {
  heading?: string;
  subheading?: string;
}

export default function Topbar({ heading, subheading }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex w-full flex-wrap items-center justify-between gap-4 border-b border-border/60 bg-background/95 pl-4 pr-12 py-3 backdrop-blur supports-[backdrop-filter]:backdrop-blur sm:pl-6 sm:pr-16">
      <div className="min-w-0 flex-1">
        {(heading || subheading) && (
          <div className="flex flex-col gap-0.5">
          {heading && (
            <Heading as="h1" size="lg" className="truncate leading-tight" weight="semibold">
              {heading}
            </Heading>
          )}
          {subheading && (
              <Text as="p" size="sm" tone="muted" className="truncate leading-tight">
              {subheading}
            </Text>
          )}
        </div>
        )}
      </div>
      
      <div className="flex w-full items-center justify-end gap-2 pr-2 sm:w-auto sm:pr-4">
        <ThemeToggle />
      </div>
    </header>
  );
}
