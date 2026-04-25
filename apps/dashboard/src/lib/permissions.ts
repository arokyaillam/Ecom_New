export function hasPermission(permissions: string[] | undefined, permission: string): boolean {
	if (!permissions) return false;
	return permissions.includes('*') || permissions.includes(permission);
}
