# Reference recipe lineage

When a user adopts a reference recipe, Mangrok creates a private recipe copy with lineage metadata:

```json
{
  "originType": "reference-recipe",
  "originId": "reference-id",
  "originVersion": "reference-version",
  "clonedAt": "ISO timestamp",
  "editorialState": "reviewed-reference"
}
```

The private copy can then be edited, sealed, shared, evolved through Alchemy, included in a book, or deleted. None of those actions changes the immutable reference record.

A later reference update must not overwrite a private copy. Mangrok may show that a newer reference version exists, but the user decides whether to compare or adopt changes.
