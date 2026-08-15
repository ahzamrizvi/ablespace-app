export const profileKeyPrefix = "able-space.profile";
export const workspaceStateKeyPrefix = "able-space.workspace";
export const guestProfileDefaults = {
  name: "Guest User",
  email: "Guest account",
  title: "Guest",
  username: "guest",
  photo: null,
};

export function buildProfileFromUser(currentUser) {
  if (currentUser.isGuest) {
    return guestProfileDefaults;
  }

  return {
    name: currentUser.name,
    email: currentUser.email ?? "",
    title: currentUser.name || "User",
    username: currentUser.name.toLowerCase().replace(/\s+/g, "") || "user",
    photo: null,
  };
}

export function getProfileStorageKey(currentUser) {
  return `${profileKeyPrefix}.${currentUser?.id ?? "guest"}`;
}

export function getWorkspaceStateStorageKey(currentUser) {
  return `${workspaceStateKeyPrefix}.${currentUser?.id ?? "guest"}`;
}
