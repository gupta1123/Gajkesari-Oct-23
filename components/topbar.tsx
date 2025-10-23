"use client";

import UserNav from "@/components/user-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { Heading, Text } from "@/components/ui/typography";

interface TopbarProps {
  heading?: string;
  subheading?: string;
}

export default function Topbar({ heading, subheading }: TopbarProps) {
  return (
    <header className="flex h-10 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
      <div className="flex-1 min-w-0">
        <div className="flex flex-col">
          {heading && (
            <Heading as="h1" size="lg" className="truncate leading-tight" weight="semibold">
              {heading}
            </Heading>
          )}
          {subheading && (
            <Text as="p" size="sm" tone="muted" className="truncate -mt-2 leading-tight">
              {subheading}
            </Text>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <ThemeToggle />
      </div>
    </header>
  );
}
