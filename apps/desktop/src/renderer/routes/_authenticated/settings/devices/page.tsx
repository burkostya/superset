import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/settings/devices/")({
	component: DevicesSettingsPage,
});

function DevicesSettingsPage() {
	return <Navigate to="/settings/appearance" replace />;
}
