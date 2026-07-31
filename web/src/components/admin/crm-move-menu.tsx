"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * The touch equivalent of dragging a card between columns.
 *
 * Drag-and-drop is a mouse metaphor, and the CRM's primary device is a phone —
 * so the board's preview commits to an explicit "move to…" picker now, rather
 * than discovering after it is built that the interaction has no touch story.
 * Choosing a stage explains that the move itself ships with the CRM.
 */
export function CrmMoveMenu({
  leadName,
  stages,
  currentStage,
  className,
}: {
  leadName: string;
  stages: readonly string[];
  currentStage: string;
  className?: string;
}) {
  const [chosen, setChosen] = useState<string | null>(null);

  return (
    <div className={className}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="h-11 w-full justify-between"
            aria-label={`Move ${leadName} to another stage`}
          >
            Move to…
            <ChevronDown />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-(--radix-dropdown-menu-trigger-width)"
        >
          <DropdownMenuLabel>Move {leadName} to</DropdownMenuLabel>
          {stages
            .filter((stage) => stage !== currentStage)
            .map((stage) => (
              <DropdownMenuItem
                key={stage}
                className="min-h-11"
                onSelect={() => setChosen(stage)}
              >
                {stage}
              </DropdownMenuItem>
            ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {chosen ? (
        <p role="status" className="mt-1.5 text-xs text-muted-foreground">
          Moving to “{chosen}” goes live with the CRM — this is a design preview.
        </p>
      ) : null}
    </div>
  );
}
