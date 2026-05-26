import { Heart } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type IntentionsPillProps = {
  ariaLabel?: string;
  className?: string;
  icon?: ReactNode;
  items?: string[];
};

const defaultItems = ["Private", "Intentional", "Inclusive"];

export function IntentionsPill({
  ariaLabel = "Private, intentional, inclusive",
  className,
  icon = <Heart aria-hidden="true" strokeWidth={1.9} />,
  items = defaultItems,
}: IntentionsPillProps) {
  return (
    <div aria-label={ariaLabel} className={cn("intentions-pill", className)}>
      <span className="intentions-pill__icon">{icon}</span>
      <span className="intentions-pill__text">{items.map(item => item.trim().toUpperCase()).join(". ")}.</span>
    </div>
  );
}
