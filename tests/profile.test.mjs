import test from "node:test";
import assert from "node:assert/strict";
import {
  archiveReadiness,
  normalizeProfile,
  profileCompleteness,
  profileInitials
} from "../src/profile.js";

test("normalizes a Mangrok owner profile with safe defaults", () => {
  const profile = normalizeProfile({
    display_name: "  Mani  ",
    culinary_role: "family_historian",
    default_privacy: "family",
    heritage_notes: "  Manipuri and Bengali family cooking  "
  }, { email: "mani@example.com" });

  assert.equal(profile.displayName, "Mani");
  assert.equal(profile.culinaryRole, "family_historian");
  assert.equal(profile.defaultPrivacy, "family");
  assert.equal(profile.heritageNotes, "Manipuri and Bengali family cooking");
  assert.equal(profile.email, "mani@example.com");
});

test("rejects unsupported role and access values by falling back safely", () => {
  const profile = normalizeProfile({ culinaryRole: "owner", defaultPrivacy: "internet" });
  assert.equal(profile.culinaryRole, "recipe_custodian");
  assert.equal(profile.defaultPrivacy, "private");
});

test("creates readable initials without exposing the email domain", () => {
  assert.equal(profileInitials({ displayName: "Mani Sharma" }), "MS");
  assert.equal(profileInitials({ email: "archive.owner@example.com" }), "AO");
  assert.equal(profileInitials({}), "M");
});

test("measures archive readiness from story, lineage, custodian, and sealed-note coverage", () => {
  const readiness = archiveReadiness([
    { origin: { story: "A", creator: "Grandmother", custodian: "Mani" }, secret: { ciphertext: "x" } },
    { origin: { place: "Imphal" }, secret: null },
    { origin: {}, secret_ciphertext: "cipher" },
    { origin: { story: "B", year: "1974", custodian: "Asha" } }
  ]);

  assert.deepEqual(readiness, {
    total: 4,
    storyCount: 2,
    lineageCount: 3,
    custodianCount: 2,
    sealedCount: 2,
    storyPercent: 50,
    lineagePercent: 75,
    custodianPercent: 50
  });
});

test("profile completeness rewards meaningful stewardship fields", () => {
  assert.equal(profileCompleteness({}), 33);
  assert.equal(profileCompleteness({
    displayName: "Mani",
    culinaryRole: "recipe_custodian",
    heritageNotes: "Family traditions",
    preservationNote: "Keep recipes with their stories",
    defaultPrivacy: "private",
    custodianName: "Mani"
  }), 100);
});
