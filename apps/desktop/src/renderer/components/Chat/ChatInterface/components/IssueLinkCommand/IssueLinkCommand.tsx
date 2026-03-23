import {
	Command,
	CommandDialog,
	CommandEmpty,
	CommandInput,
	CommandList,
} from "@superset/ui/command";
import { Popover, PopoverAnchor, PopoverContent } from "@superset/ui/popover";
import type React from "react";
import type { RefObject } from "react";
import { useState } from "react";

type IssueLinkCommandProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSelect: (
		slug: string,
		title: string,
		taskId: string | undefined,
		url?: string,
	) => void;
} & (
	| { variant?: "dialog" }
	| { variant: "popover"; anchorRef: RefObject<HTMLElement | null> }
);

export function IssueLinkCommand(props: IssueLinkCommandProps) {
	const { open, onOpenChange } = props;
	const [searchQuery, setSearchQuery] = useState("");

	const handleClose = () => {
		setSearchQuery("");
		onOpenChange(false);
	};

	const issueListContent = (
		<>
			<CommandInput
				placeholder="Issue linking is unavailable in local mode"
				value={searchQuery}
				onValueChange={setSearchQuery}
			/>
			<CommandList className={props.variant === "popover" ? "max-h-[280px]" : undefined}>
				<CommandEmpty>
					Tasks and cloud issue sync are disabled in local desktop mode.
				</CommandEmpty>
			</CommandList>
		</>
	);

	if (props.variant === "popover") {
		return (
			<Popover open={open}>
				<PopoverAnchor
					virtualRef={props.anchorRef as React.RefObject<Element>}
				/>
				<PopoverContent
					className="w-80 p-0"
					align="end"
					side="top"
					onWheel={(event) => event.stopPropagation()}
					onPointerDownOutside={handleClose}
					onEscapeKeyDown={handleClose}
					onFocusOutside={(e) => e.preventDefault()}
				>
					<Command shouldFilter={false}>{issueListContent}</Command>
				</PopoverContent>
			</Popover>
		);
	}

	return (
		<CommandDialog
			open={open}
			onOpenChange={(nextOpen) => {
				if (!nextOpen) setSearchQuery("");
				onOpenChange(nextOpen);
			}}
			modal
			title="Link issue"
			description="Search for an issue to link"
			showCloseButton={false}
		>
			{issueListContent}
		</CommandDialog>
	);
}
