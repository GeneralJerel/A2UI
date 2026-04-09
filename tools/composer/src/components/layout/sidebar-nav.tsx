/**
 * Copyright 2026 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SquarePlus,
  LayoutGrid,
  Box,
  Shapes,
  LucideIcon,
  BookOpen,
  Play,
  Puzzle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCatalog } from "@/contexts/catalog-context";

interface NavItemProps {
  icon: LucideIcon;
  label: string;
  subtitle?: string;
  href: string;
  external?: boolean;
  selected?: boolean;
  badge?: string;
  onClick?: () => void;
}

function NavItem({
  icon: Icon,
  label,
  subtitle,
  href,
  external,
  selected,
  badge,
  onClick,
}: NavItemProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
        selected
          ? "bg-white text-foreground shadow-sm"
          : "text-muted-foreground hover:bg-white/50 hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <span className="truncate">{label}</span>
        {subtitle && <span className="text-xs opacity-75">{subtitle}</span>}
      </div>
      {badge && (
        <span className="shrink-0 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-700">
          {badge}
        </span>
      )}
    </Link>
  );
}

interface SidebarNavProps {
  onNavigate?: () => void;
}

export function SidebarNav({ onNavigate }: SidebarNavProps) {
  const pathname = usePathname();
  const { activeCatalog } = useCatalog();

  const navItems = [
    { icon: SquarePlus, label: "Create", href: "/" },
    { icon: LayoutGrid, label: "Gallery", href: "/gallery" },
    { icon: Box, label: "Basic Components", href: "/components" },
    { icon: Puzzle, label: "Custom Catalog", href: "/catalog", badge: activeCatalog.isBasic ? undefined : "Active" },
    { icon: Shapes, label: "Icons", href: "/icons" },
    { icon: Play, label: "Theater", subtitle: "JSONL Playback", href: "/theater" },
    {
      icon: BookOpen,
      label: "Tutorial",
      subtitle: "CopilotKit + A2UI",
      external: true,
      href: "https://docs.copilotkit.ai/a2a/generative-ui/declarative-a2ui",
    },
  ];

  return (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => (
        <NavItem
          key={item.href}
          icon={item.icon}
          label={item.label}
          subtitle={item.subtitle}
          href={item.href}
          external={item.external}
          selected={pathname === item.href}
          badge={'badge' in item ? item.badge : undefined}
          onClick={onNavigate}
        />
      ))}
    </nav>
  );
}
