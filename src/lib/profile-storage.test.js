const test = require("node:test");
const assert = require("node:assert/strict");

const { buildProfileFromUser, getProfileStorageKey } = require("./profile-storage.js");

test("buildProfileFromUser returns guest defaults for guest users", () => {
  assert.deepEqual(buildProfileFromUser({ id: "guest-1", name: "Guest User", email: null, isGuest: true }), {
    name: "Guest User",
    email: "Guest account",
    title: "Guest",
    username: "guest",
    photo: null,
  });
});

test("buildProfileFromUser derives profile fields for non-guest users", () => {
  assert.deepEqual(buildProfileFromUser({ id: "user-1", name: "Ahzam Rizvi", email: "ahzam@example.com", isGuest: false }), {
    name: "Ahzam Rizvi",
    email: "ahzam@example.com",
    title: "Ahzam Rizvi",
    username: "ahzamrizvi",
    photo: null,
  });
});

test("getProfileStorageKey scopes storage by user id", () => {
  assert.equal(getProfileStorageKey({ id: "user-1" }), "able-space.profile.user-1");
  assert.equal(getProfileStorageKey(null), "able-space.profile.guest");
});
