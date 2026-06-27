# Firebase/Firestore Security Specification

This document details the security model, access control specifications, and hardened scenarios for the SkyIT Ventures application.

## 1. Core Data Invariants

1. **Admins Verification**: Only users logging in with verified emails can access `/admins/{adminId}` as an admin. The user is considered an Admin if there exists a document under `/admins/{uid}` matching their authenticated key, AND their email is verified and matched to `jeemestore@gmail.com`.
2. **Orders Integrity**: Anyone can check the tracking status of a specific order if they know the tracking Code (read access). However, write operations (creating, updating order statuses) are restricted to the matching customer (for self-booking creation) or an authorized Admin (for full-stage progression changes).
3. **Immutability of Key Diagnostics**: Order metadata like `id`, `createdAt`, `userId` are strictly frozen upon initial document write. No client SDK can rewrite these parameters.
4. **Temporal Integrity**: All timestamp parameters (`createdAt`, `updatedAt`) must strictly equal the database server timestamp (`request.time`).

---

## 2. The "Dirty Dozen" Attack Vectors (TDD Scenarios)

These payloads are designed to attack the system. The Security Rules are mathematically built to return `PERMISSION_DENIED` to all twelve.

### Scenario 1-3: Identity Spoofing & Escalation
- **Attack 1 (Self-Claim Admin)**: Anonymous user attempts to write to `/admins/attacker_uid` labeling themselves as `{role: "admin", email: "malicious@attacker.org"}`.
- **Attack 2 (Fake Admin Email Claim)**: User logged in as `unverified@attacker.org` attempts to write an admin profile asserting they are `jeemestore@gmail.com`.
- **Attack 3 (Spoof Owner Fields)**: Authenticated customer `uid-123` attempts to submit an order with a pre-set `userId: "uid-888"` to charge/associate it to a different customer.

### Scenario 4-7: Schema Integrity & Poisoning
- **Attack 4 (Payload Bloat / Ghost Fields)**: Attacker attempts to submit an order with undocumented parameter `hasPaidTotalDiscount: true` to trigger state shortcuts.
- **Attack 5 (Oversized Payload Exhaustion)**: Attacker attempts to set an order's code description to a 5MB junk string to cause database wallet leakage.
- **Attack 6 (Invalid Type Poisoning)**: User attempts to write `status: true` instead of a string value ('pending', 'confirmed', etc.).
- **Attack 7 (Poisoned Path Variable ID)**: Attacker attempts to store a document with a non-alphanumeric key `orders/%20../attacker` to breach directories.

### Scenario 8-12: State & Time Integrity
- **Attack 8 (Backdated Timestamps)**: Customer attempts to specify `createdAt: "2010-01-01"` to claim long-standing credit or bypass expiration.
- **Attack 9 (Post-Delivery Alteration)**: Attacker attempts to unlock an order after its status has reached the terminal state `'delivered'` to revert item arrays.
- **Attack 10 (Direct Field Mutation Bypass)**: Customer attempts to bypass the validation helper by executing a partial patch updating `createdAt` during standard status checks.
- **Attack 11 (Unauthenticated Creation)**: Unauthenticated visitor attempts to insert purchase order documents.
- **Attack 12 (Wildcard Read Scraping)**: Logged in customer attempts to execute an unfiltered query matching all `/orders/` collections without pointing to their self-owned ID list.

---

## 3. Threat-Matrix Evaluation

| Threat Vector | Mitigation Strategy | Rule Enforced |
| :--- | :--- | :--- |
| **Identity Spoofing** | Strict UID and verified email comparison | `request.auth.uid == adminId` |
| **State Shortcutting** | Field comparison diff constraints | `incoming().diff(existing()).affectedKeys().hasOnly(...)` |
| **Resource Poisoning** | String length boundaries & ID regex checks | `.size() < 128 && id.matches(...)` |
