import { Moon, Sun, Sunset } from "lucide-react";
import type { SlotId } from "@/lib/booking";

const icons = {
  morning: Sun,
  evening: Sunset,
  night: Moon,
};

export function SlotIcon({
  id,
  className,
}: {
  id: SlotId;
  className?: string;
}) {
  const Icon = icons[id];
  return <Icon aria-hidden strokeWidth={1.6} className={className} />;
}
