"use client";

import Link from "next/link";
import { forwardRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavLinkCompatProps {
  href: string;
  children?: ReactNode;
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
  end?: boolean;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, pendingClassName, href, end, ...props }, ref) => {
    const pathname = usePathname() ?? "";
    const isActive = typeof href === "string"
      ? (end ? pathname === href : pathname === href || pathname.startsWith(`${href}/`))
      : false;
    return (
      <Link
        ref={ref}
        href={href as any}
        className={cn(className, isActive && activeClassName, pendingClassName)}
        {...props}
      />
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
