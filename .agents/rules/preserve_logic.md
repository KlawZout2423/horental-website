# Non-Destructive Code Modifications & Guard Preservation Rule

## Policy Statement
All AI coding agents working in this repository MUST strictly preserve pre-existing business logic, authentication guards, user flow validations, modal triggers, and feature behaviors unless explicitly requested by the user to remove or replace them.

---

## Directives

1. **Mandatory Inspection of Full Function Context**:
   - Before replacing, refactoring, or updating any function or component handler, view the entire function body (not just partial snippets) to identify all existing guard clauses, authorization checks (e.g. `if (!user)`), auxiliary loggers, and state transitions.

2. **Preservation of Guard Clauses & Auth Locks**:
   - Never remove, bypass, or comment out pre-existing authentication/authorization guards (such as `if (!user) { setShowAuthPrompt(true); return; }`).
   - If enhancing a function (e.g. adding new parameters or asynchronous tasks), wrap additions inside the existing control flow without dropping pre-existing steps.

3. **Explicit User Consent for Removals**:
   - A working function, field, or validation routine must NEVER be removed unless the user explicitly commands its deletion in their request.

4. **Automated Build Verification**:
   - Always run `npm run build` after editing to ensure zero broken references, type errors, or unhandled imports.
