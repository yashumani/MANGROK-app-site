# Acceptance tests

Use two independent test accounts, A and B, plus a private/incognito browser. Record evidence for every result.

## Device-only

1. Create, edit, favorite, search, filter, and delete recipes.
2. Encrypt a sealed note; confirm the correct passphrase opens it and a wrong passphrase fails.
3. Reload and confirm recipes persist; cover the screen and reopen it.
4. Export, erase, import, and compare the restored recipe count and content.
5. Attach an image and audio file; confirm they remain local and the JSON export warns that binary data is omitted.
6. Print a book; confirm secrets cannot be included without both unlocking and explicit irreversible-output approval.
7. Test keyboard-only navigation and screen-reader labels at 320, 768, 1024, and 1440 pixel widths.

## Cloud isolation

1. A creates a private recipe. B must receive zero rows when querying or guessing its UUID.
2. A grants B viewer access. B can read but cannot update.
3. A grants contributor access. B may edit standard fields but attempts to change owner, privacy, or encrypted-secret fields must fail.
4. A revokes the grant. B loses access on the next request.
5. Test expired direct and circle grants.
6. Confirm Storage objects are unreadable without recipe access and paths cannot be written outside the caller's UUID folder.
7. Confirm a browser anonymous key cannot select other profiles, print orders, account-deletion requests, or service-only records.

## Share links

1. Create a view-limited link, use it to the limit, and confirm the next request fails.
2. Revoke a link and confirm it fails immediately.
3. Create a link with a sealed note. Confirm the database stores ciphertext but not the fragment key.
4. Remove the URL fragment and confirm the standard recipe remains readable while the secret cannot be decrypted.

## Recovery and lifecycle

1. Request account deletion and confirm a cooling-off record is created rather than immediate silent deletion.
2. Restore an earlier recipe version as a new revision.
3. Confirm a legacy threshold moves a plan only to `review_pending` and releases zero recipes.
4. Submit the same print `requestId` twice and confirm only one order row exists.
5. Confirm print requests without a reviewed private proof return `proof_required` and missing provider credentials return `provider_not_configured` without placing an order.
