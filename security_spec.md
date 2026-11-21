# Sitara Cloth House — Security Specification (Phase 0)

## 1. Data Invariants
1. Every document under `/shops/{shopId}` and all subcollections (`products`, `parties`, `invoices`, `khata`, `expenses`, `salesmen`, `backups`) belongs strictly to `shopId == request.auth.uid` with `request.auth.token.email_verified == true` (or bootstrapped admin `abm55136@gmail.com`).
2. Every subcollection write validates parent `/shops/{shopId}` ownership via `get()` (Master Gate) and enforces `incoming().ownerId == request.auth.uid`.
3. All document IDs (`shopId`, `productId`, `partyId`, `invoiceId`, `entryId`, `expenseId`, `salesmanId`, `backupId`) must match `^[a-zA-Z0-9_-]+$` and length `<= 128`.
4. All strings enforce explicit `.size()` bounds; all lists (`invoice.items`) are bounded (`1 <= size <= 50`).
5. `createdAt` and `ownerId` are immutable after creation (`incoming().createdAt == existing().createdAt`, `incoming().ownerId == existing().ownerId`); server `request.time` is enforced on `createdAt`/`updatedAt`.
6. Terminal status locking: Once an invoice reaches `status == 'returned'`, subsequent updates are rejected unless performed by admin.

## 2. The "Dirty Dozen" Attack Payloads (All Must Return PERMISSION_DENIED)
1. **Unauthenticated Read/Write**: Read `/shops/user1/products/p1` with `auth == null`.
2. **Unverified Email Spoof**: Write `/shops/user1` with `email_verified: false`.
3. **Cross-Tenant Shop Access**: `user2` reads or writes `/shops/user1/khata/k1`.
4. **Shadow Ghost Field Injection**: Create `/shops/user1/products/p1` with extra `isAdmin: true`.
5. **OwnerId Spoofing**: Create `/shops/user1/expenses/e1` with `ownerId: "user2"`.
6. **ID Poisoning (1KB ID)**: Create `/shops/user1/products/<1000-char-id>` or invalid chars `../hack`.
7. **Unbounded String DoS**: Create product with `name` of 5,000 characters.
8. **Client-Forged Timestamp**: Create expense with `createdAt` set to a past year instead of `request.time`.
9. **Immutable Owner Mutation**: Update product changing `ownerId` from `user1` to `user2`.
10. **Terminal Invoice Tampering**: Update an invoice whose `status == 'returned'` back to `'completed'`.
11. **Unbounded Invoice Items Array**: Create invoice with `items` containing 51+ elements or non-map items.
12. **Blanket List Query Scraping**: `user2` lists `/shops/user1/parties` containing customer PII (`phone`, `address`).
