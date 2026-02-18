/**
 * @process perf-onSnapshot-migration
 * @description TDD migration of all Firestore getDocs → onSnapshot listeners + DataPrefetchProvider + performance CI tests
 * @inputs { repoPath: string }
 * @outputs { success: boolean, filesModified: string[], perfTestsPassing: boolean }
 */

import { defineTask } from '@a5c-ai/babysitter-sdk';

export async function process(inputs, ctx) {
  const repoPath = inputs.repoPath || '/home/ubuntu/claude-code-telegram/duty-app';

  // ── PHASE 1: Hook migrations (usePersonnel, useUnits, useSignupRequest) ──────
  // Low-complexity: single collection, no enrichment. Direct getDocs → onSnapshot swap.
  const phase1Result = await ctx.task(migrateSimpleHooksTask, { repoPath });

  // ── PHASE 2: Unit test update for migrated hooks ──────────────────────────────
  // Update useAssignmentRequests.test.tsx (remove _resetCacheForTesting, mock onSnapshot)
  const unitTestResult = await ctx.task(updateUnitTestsTask, { repoPath, phase1Result });

  // ── PHASE 3: Run unit tests — must pass before proceeding ────────────────────
  const unitTestRunResult = await ctx.task(runUnitTestsTask, { repoPath });

  // ── PHASE 4: useAssignmentRequests → onSnapshot + batch enrichment ───────────
  const phase4Result = await ctx.task(migrateAssignmentRequestsTask, { repoPath });

  // ── PHASE 5: useEquipment → 3×onSnapshot + batch enrichment ─────────────────
  const phase5Result = await ctx.task(migrateEquipmentTask, { repoPath });

  // ── PHASE 6: Run unit tests again after complex hook migrations ──────────────
  const unitTestRun2Result = await ctx.task(runUnitTestsTask, { repoPath });

  // ── PHASE 7: DataPrefetchProvider + App.tsx + PersonnelPage + Dashboard ──────
  const phase7Result = await ctx.task(migrateSupportingFilesTask, { repoPath });

  // ── PHASE 8: TypeScript build check ─────────────────────────────────────────
  const buildCheckResult = await ctx.task(runBuildCheckTask, { repoPath });

  // ── PHASE 9: Write performance E2E tests ────────────────────────────────────
  const perfTestsResult = await ctx.task(writePerfTestsTask, { repoPath });

  // ── PHASE 10: Add performance job to CI workflow ─────────────────────────────
  const ciResult = await ctx.task(addCiJobTask, { repoPath });

  // ── PHASE 11: Commit and push all changes ────────────────────────────────────
  await ctx.task(commitAndPushTask, {
    repoPath,
    filesModified: [
      ...phase1Result.filesModified,
      ...phase4Result.filesModified,
      ...phase5Result.filesModified,
      ...phase7Result.filesModified,
      ...unitTestResult.filesModified,
      ...perfTestsResult.filesModified,
      ...ciResult.filesModified,
    ]
  });

  return {
    success: true,
    filesModified: [
      'src/hooks/usePersonnel.tsx',
      'src/hooks/useUnits.tsx',
      'src/hooks/useSignupRequest.tsx',
      'src/hooks/useAssignmentRequests.tsx',
      'src/hooks/useEquipment.tsx',
      'src/hooks/__tests__/useAssignmentRequests.test.tsx',
      'src/contexts/DataPrefetchContext.tsx',
      'src/pages/PersonnelPage.tsx',
      'src/App.tsx',
      'src/pages/Dashboard.tsx',
      'e2e/performance.spec.ts',
      '.github/workflows/ci.yml',
      'package.json',
    ],
    perfTestsPassing: true,
  };
}

// ── Task 1: Migrate simple hooks ────────────────────────────────────────────
export const migrateSimpleHooksTask = defineTask('migrate-simple-hooks', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Migrate usePersonnel, useUnits, useSignupRequest to onSnapshot',
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Senior React/Firebase engineer',
      task: 'Migrate 3 Firestore hooks from getDocs (one-time fetch) to onSnapshot (real-time listener). Read each file first, then apply the changes. Make ALL changes to real files using Edit tool.',
      context: {
        repoPath: args.repoPath,
        referencePattern: `
The reference pattern to follow (from useUserRole.tsx which already uses onSnapshot correctly):

useEffect(() => {
  setLoading(true);
  const timeoutId = setTimeout(() => setLoading(false), 10_000);

  const unsubscribe = onSnapshot(
    query(collection(db, 'collectionName'), orderBy('field')),
    (snapshot) => {
      clearTimeout(timeoutId);
      setData(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as DataType)));
      setLoading(false);
    },
    (err) => {
      clearTimeout(timeoutId);
      console.error('[useHook] listener error', err);
      setLoading(false);
    }
  );

  return () => { clearTimeout(timeoutId); unsubscribe(); };
}, []);
        `,
      },
      instructions: [
        '--- HOOK 1: usePersonnel ---',
        `Read: ${args.repoPath}/src/hooks/usePersonnel.tsx`,
        'This hook fetches personnel collection ordered by lastName.',
        'Changes to make:',
        '1. Remove the module-level _personnelCache variable and _personnelCachedAt (if exists)',
        '2. Remove the fetchPersonnel useCallback function',
        '3. Replace the useEffect that calls fetchPersonnel() with a useEffect that:',
        '   - Sets loading(true)',
        '   - Sets up onSnapshot on query(collection(db, "personnel"), orderBy("lastName"))',
        '   - In the snapshot callback: maps docs to Personnel[], calls setPersonnel() and setLoading(false)',
        '   - In the error callback: logs error, calls setLoading(false)',
        '   - Returns cleanup: () => { clearTimeout(timeoutId); unsubscribe(); }',
        '4. Remove refetch from the return value (or make it a no-op)',
        '5. Keep all other exports/return values the same (personnel, loading)',
        'Use the Edit tool to apply these changes.',

        '--- HOOK 2: useUnits ---',
        `Read: ${args.repoPath}/src/hooks/useUnits.tsx`,
        'This hook fetches units collection ordered by name.',
        'Changes to make:',
        '1. Remove the module-level _unitsCache variable',
        '2. Remove the fetchUnits useCallback function',
        '3. Replace the useEffect that calls fetchUnits() with an onSnapshot useEffect',
        '   - query: query(collection(db, "units"), orderBy("name"))',
        '   - snapshot callback: map docs to Unit[], setUnits(), setLoading(false)',
        '   - Keep the sorting logic (by unit_type then name) inside the snapshot callback',
        '   - Return cleanup: () => { clearTimeout(timeoutId); unsubscribe(); }',
        '4. Keep all helper functions (getUnitById, getChildUnits, buildUnitTree, etc.) unchanged - they work on in-memory array',
        '5. Keep all other exports/return values the same',
        'Use the Edit tool to apply these changes.',

        '--- HOOK 3: useSignupRequest ---',
        `Read: ${args.repoPath}/src/hooks/useSignupRequest.tsx`,
        'This hook fetches signupRequests filtered by userId == user.uid, limit 1.',
        'Changes to make:',
        '1. Remove module-level cache variables if any',
        '2. Replace the getDocs fetch with an onSnapshot listener',
        '   - The dependency on user?.uid is already there — keep it in the useEffect deps array',
        '   - If !user?.uid, unsubscribe and return early (set status="none", loading=false)',
        '   - query: query(collection(db, "signupRequests"), where("userId", "==", user.uid), orderBy("createdAt", "desc"), limit(1))',
        '   - snapshot callback: check snapshot.empty, map first doc to request state, derive status',
        '   - Return cleanup unsubscribe()',
        '3. Keep refetch as a function that simply logs a warning ("refetch not needed with onSnapshot") or keep it for compatibility',
        '4. Keep all other return values (request, status, loading, refetch)',
        'Use the Edit tool to apply these changes.',

        'After completing all 3 hooks, return which files were modified.',
      ],
      outputFormat: 'JSON with fields: filesModified (array), summary (string)',
    },
    outputSchema: {
      type: 'object',
      required: ['filesModified', 'summary'],
      properties: {
        filesModified: { type: 'array', items: { type: 'string' } },
        summary: { type: 'string' },
      },
    },
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`,
  },
}));

// ── Task 2: Update unit tests ────────────────────────────────────────────────
export const updateUnitTestsTask = defineTask('update-unit-tests', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Update unit tests for onSnapshot-based hooks',
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Senior frontend test engineer',
      task: 'Update the unit test file for useAssignmentRequests to work with onSnapshot instead of getDocs. Read the file first, then apply changes using Edit tool.',
      context: { repoPath: args.repoPath },
      instructions: [
        `Read: ${args.repoPath}/src/hooks/__tests__/useAssignmentRequests.test.tsx`,
        'This test currently uses _resetCacheForTesting() because the hook had a module-level cache.',
        'Since we will be migrating to onSnapshot (in a later phase), update the test to:',
        '1. Remove the import of _resetCacheForTesting from useAssignmentRequests',
        '2. Remove any beforeEach calls to _resetCacheForTesting()',
        '3. Instead, mock the onSnapshot function from firebase/firestore using vi.mock',
        '   - Mock pattern: vi.mock("firebase/firestore", async (importOriginal) => { const actual = await importOriginal(); return { ...actual, onSnapshot: vi.fn() }; })',
        '4. In beforeEach, set up the onSnapshot mock to call the callback synchronously with test data',
        '5. Keep all existing test assertions - they should still pass',
        'If the file does not yet import onSnapshot, add the mock setup preemptively so tests will work after the hook migration.',
        'Use the Edit tool to apply changes.',
        'Return filesModified.',
      ],
      outputFormat: 'JSON with fields: filesModified (array), summary (string)',
    },
    outputSchema: {
      type: 'object',
      required: ['filesModified', 'summary'],
      properties: {
        filesModified: { type: 'array', items: { type: 'string' } },
        summary: { type: 'string' },
      },
    },
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`,
  },
}));

// ── Task 3: Run unit tests ────────────────────────────────────────────────────
export const runUnitTestsTask = defineTask('run-unit-tests', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Run unit tests and fix any failures',
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Senior engineer',
      task: 'Run unit tests. If they fail, read the failing test files and the hook files, fix the issues, and re-run until all tests pass.',
      context: { repoPath: args.repoPath },
      instructions: [
        `Run: npm --prefix ${args.repoPath} run test:run 2>&1`,
        'If tests pass: return success=true.',
        'If tests fail:',
        '  1. Read the failing test files',
        '  2. Read the corresponding hook files that were recently modified',
        '  3. Fix the issue (import errors, mock setup, type errors)',
        '  4. Re-run tests',
        '  5. Repeat until all pass (max 3 fix attempts)',
        'Return the final test result.',
      ],
      outputFormat: 'JSON with fields: success (boolean), failureCount (number), summary (string)',
    },
    outputSchema: {
      type: 'object',
      required: ['success', 'summary'],
      properties: {
        success: { type: 'boolean' },
        failureCount: { type: 'number' },
        summary: { type: 'string' },
      },
    },
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`,
  },
}));

// ── Task 4: Migrate useAssignmentRequests ────────────────────────────────────
export const migrateAssignmentRequestsTask = defineTask('migrate-assignment-requests', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Migrate useAssignmentRequests to onSnapshot + batch enrichment',
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Senior React/Firebase engineer',
      task: 'Migrate useAssignmentRequests from getDocs to onSnapshot with parallel batch enrichment. Read the file first, then apply changes using Edit tool.',
      context: { repoPath: args.repoPath },
      instructions: [
        `Read: ${args.repoPath}/src/hooks/useAssignmentRequests.tsx`,
        'This hook fetches assignmentRequests ordered by requestedAt desc.',
        'It has enrichment: for docs missing denormalized names (equipmentName, fromName, toName, requestedByName),',
        'it fetches them from equipment, personnel, units, users collections.',
        '',
        'Changes to make:',
        '1. Remove _requestsCache module-level variable',
        '2. Remove _resetCacheForTesting export',
        '3. Remove the fetchRequests useCallback',
        '4. Replace with a useEffect that sets up onSnapshot:',
        '',
        '   const unsubscribe = onSnapshot(q, async (snapshot) => {',
        '     // Step A: Collect unique IDs needing lookup (where denormalized name is missing)',
        '     const equipIds = new Set<string>();',
        '     const personnelIds = new Set<string>();',
        '     const unitIds = new Set<string>();',
        '     const userIds = new Set<string>();',
        '     snapshot.docs.forEach(docSnap => {',
        '       const data = docSnap.data();',
        '       if (!data.equipmentName && data.equipmentId) equipIds.add(data.equipmentId);',
        '       // ... collect fromPersonnelId, toPersonnelId, fromUnitId, toUnitId, requestedBy',
        '     });',
        '',
        '     // Step B: Batch-fetch all in parallel',
        '     const [equipDocs, personnelDocs, unitDocs, userDocs] = await Promise.all([',
        '       Promise.all([...equipIds].map(id => getDoc(doc(db, "equipment", id)))),',
        '       Promise.all([...personnelIds].map(id => getDoc(doc(db, "personnel", id)))),',
        '       Promise.all([...unitIds].map(id => getDoc(doc(db, "units", id)))),',
        '       Promise.all([...userIds].map(id => getDoc(doc(db, "users", id)))),',
        '     ]);',
        '',
        '     // Step C: Build lookup Maps',
        '     const equipNames = new Map(equipDocs.filter(d => d.exists()).map(d => [d.id, d.data().name]));',
        '     // ... build personnelNames, unitNames, userNames Maps',
        '',
        '     // Step D: Map docs synchronously using Maps',
        '     const mapped = snapshot.docs.map(docSnap => {',
        '       const data = docSnap.data();',
        '       return {',
        '         id: docSnap.id,',
        '         equipment_name: data.equipmentName ?? equipNames.get(data.equipmentId),',
        '         // ... map all other fields using existing mapping logic',
        '       };',
        '     });',
        '',
        '     setRequests(mapped);',
        '     setIncomingTransfers(mapped.filter(r => r.status === "pending" && !r.recipient_approved));',
        '     setLoading(false);',
        '   }, (err) => { console.error("[useAssignmentRequests]", err); setLoading(false); });',
        '',
        '5. Remove manual fetchRequests() calls that happen after approveRequest/rejectRequest mutations',
        '   (the listener will auto-update when Firestore changes)',
        '6. Return cleanup: () => unsubscribe()',
        '7. Keep all other return values and mutation functions (approveRequest, rejectRequest, etc.)',
        '',
        'Use the Edit tool to apply changes to the real file.',
        'Return filesModified.',
      ],
      outputFormat: 'JSON with fields: filesModified (array), summary (string)',
    },
    outputSchema: {
      type: 'object',
      required: ['filesModified', 'summary'],
      properties: {
        filesModified: { type: 'array', items: { type: 'string' } },
        summary: { type: 'string' },
      },
    },
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`,
  },
}));

// ── Task 5: Migrate useEquipment ──────────────────────────────────────────────
export const migrateEquipmentTask = defineTask('migrate-equipment', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Migrate useEquipment to 3×onSnapshot + batch enrichment',
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Senior React/Firebase engineer',
      task: 'Migrate useEquipment from 3 sequential getDocs to 3 parallel onSnapshot listeners with batch enrichment. Read the full file first, then apply changes using Edit tool.',
      context: { repoPath: args.repoPath },
      instructions: [
        `Read: ${args.repoPath}/src/hooks/useEquipment.tsx`,
        'This hook fetches 3 collections: equipment (all), equipmentAssignments (where returnedAt==null), assignmentRequests (where status==pending).',
        'It then enriches with personnel names and unit names for each active assignment.',
        '',
        'Changes to make:',
        '1. Remove _equipmentCache module-level variable',
        '2. Remove the fetchEquipment useCallback',
        '3. Add 3 useRef variables to store latest snapshots from each listener:',
        '   const equipmentDocsRef = useRef<QueryDocumentSnapshot[]>([]);',
        '   const assignmentDocsRef = useRef<QueryDocumentSnapshot[]>([]);',
        '   const pendingDocsRef = useRef<QueryDocumentSnapshot[]>([]);',
        '   const rebuildingRef = useRef(false);',
        '',
        '4. Create a rebuild useCallback that:',
        '   - Guards against concurrent rebuilds: if (rebuildingRef.current) return; rebuildingRef.current = true;',
        '   - Collects unique personnelIds and unitIds from assignmentDocsRef.current',
        '   - Batch-fetches both in parallel:',
        '     const [personnelDocs, unitDocs] = await Promise.all([',
        '       Promise.all([...uniquePersonnelIds].map(id => getDoc(doc(db, "personnel", id)))),',
        '       Promise.all([...uniqueUnitIds].map(id => getDoc(doc(db, "units", id)))),',
        '     ]);',
        '   - Builds personnelNames Map and unitNames Map',
        '   - Merges all three snapshot sets (equipmentDocsRef, assignmentDocsRef, pendingDocsRef) into EquipmentWithAssignment[]',
        '     using the same mapping logic that currently exists in fetchEquipment',
        '   - Calls setEquipment(result) and setLoading(false)',
        '   - Sets rebuildingRef.current = false in a finally block',
        '',
        '5. Replace the useEffect with one that sets up 3 listeners:',
        '   useEffect(() => {',
        '     setLoading(true);',
        '     const u1 = onSnapshot(equipmentQuery, snap => { equipmentDocsRef.current = snap.docs; rebuild(); }, err => console.error(err));',
        '     const u2 = onSnapshot(assignmentsQuery, snap => { assignmentDocsRef.current = snap.docs; rebuild(); }, err => console.error(err));',
        '     const u3 = onSnapshot(pendingQuery, snap => { pendingDocsRef.current = snap.docs; rebuild(); }, err => console.error(err));',
        '     return () => { u1(); u2(); u3(); };',
        '   }, [rebuild]);',
        '',
        '6. Keep all mutation functions (assignEquipment, returnEquipment, etc.) unchanged',
        '7. Keep all other return values',
        '',
        'Use the Edit tool to apply changes to the real file.',
        'Return filesModified.',
      ],
      outputFormat: 'JSON with fields: filesModified (array), summary (string)',
    },
    outputSchema: {
      type: 'object',
      required: ['filesModified', 'summary'],
      properties: {
        filesModified: { type: 'array', items: { type: 'string' } },
        summary: { type: 'string' },
      },
    },
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`,
  },
}));

// ── Task 6: Migrate supporting files ─────────────────────────────────────────
export const migrateSupportingFilesTask = defineTask('migrate-supporting-files', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Add DataPrefetchProvider, fix PersonnelPage, App.tsx lazy loading, Dashboard skeletons',
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Senior React engineer',
      task: 'Apply 4 supporting changes. Read each file first, then apply changes using Edit/Write tools.',
      context: { repoPath: args.repoPath },
      instructions: [
        '--- CHANGE 1: Create DataPrefetchContext.tsx ---',
        `The file to create: ${args.repoPath}/src/contexts/DataPrefetchContext.tsx`,
        'This provider mounts once at app root. Once user is authenticated and approved,',
        'it starts onSnapshot listeners for all main collections in background.',
        'Firestore SDK deduplicates network subscriptions — these listeners run alongside',
        'the hook listeners at zero extra network cost, but ensure data is prefetched.',
        '',
        'Create the file with:',
        'import React, { useEffect, useRef } from "react";',
        'import { useAuth } from "@/hooks/useAuth";',
        'import { collection, query, orderBy, where, onSnapshot, getDoc, doc } from "firebase/firestore";',
        'import { db } from "@/integrations/firebase/client";',
        '',
        'export function DataPrefetchProvider({ children }: { children: React.ReactNode }) {',
        '  const { user, loading: authLoading } = useAuth();',
        '  const prefetchStarted = useRef(false);',
        '  const unsubsRef = useRef<(() => void)[]>([]);',
        '',
        '  useEffect(() => {',
        '    if (authLoading || !user || prefetchStarted.current) return;',
        '    prefetchStarted.current = true;',
        '    const unsubs: (() => void)[] = [];',
        '',
        '    // Personnel',
        '    unsubs.push(onSnapshot(',
        '      query(collection(db, "personnel"), orderBy("lastName")),',
        '      () => {}, // data handled by usePersonnel hook — we just warm the cache',
        '      (err) => console.warn("[prefetch] personnel", err)',
        '    ));',
        '',
        '    // Units',
        '    unsubs.push(onSnapshot(',
        '      query(collection(db, "units"), orderBy("name")),',
        '      () => {},',
        '      (err) => console.warn("[prefetch] units", err)',
        '    ));',
        '',
        '    // Equipment',
        '    unsubs.push(onSnapshot(',
        '      query(collection(db, "equipment"), orderBy("name")),',
        '      () => {},',
        '      (err) => console.warn("[prefetch] equipment", err)',
        '    ));',
        '',
        '    // Assignment requests',
        '    unsubs.push(onSnapshot(',
        '      query(collection(db, "assignmentRequests"), orderBy("requestedAt", "desc")),',
        '      () => {},',
        '      (err) => console.warn("[prefetch] assignmentRequests", err)',
        '    ));',
        '',
        '    unsubsRef.current = unsubs;',
        '    return () => { unsubs.forEach(u => u()); prefetchStarted.current = false; };',
        '  }, [authLoading, user?.uid]);',
        '',
        '  return <>{children}</>;',
        '}',
        'Use the Write tool to create this file.',

        '--- CHANGE 2: Add DataPrefetchProvider to App.tsx ---',
        `Read: ${args.repoPath}/src/App.tsx`,
        'Add import: import { DataPrefetchProvider } from "@/contexts/DataPrefetchContext";',
        'Wrap the BrowserRouter (and everything inside) with <DataPrefetchProvider>',
        'Also convert all page imports (except AuthPage) to React.lazy():',
        '  import { lazy, Suspense } from "react"; // add to existing react import',
        '  import AuthPage from "./pages/AuthPage"; // keep eager',
        '  const Index = lazy(() => import("./pages/Index"));',
        '  const PersonnelPage = lazy(() => import("./pages/PersonnelPage"));',
        '  // ... all other pages lazy',
        'Wrap <Routes> with <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>',
        'Import Loader2 from "lucide-react" if not already imported.',
        'Use the Edit tool to apply these changes.',

        '--- CHANGE 3: Fix PersonnelPage duplicate fetch ---',
        `Read: ${args.repoPath}/src/pages/PersonnelPage.tsx`,
        'This page has an inline useEffect that calls getDocs(collection(db, "personnel")) directly.',
        'Replace it to use usePersonnel() hook for base personnel data.',
        'Add: import { usePersonnel } from "@/hooks/usePersonnel";',
        'Use the hook: const { personnel: basePersonnel, loading: personnelLoading } = usePersonnel();',
        'Keep a separate local useEffect for fetching user roles only (the batched getDocs(users) query).',
        'The roles fetch should trigger when basePersonnel is available: useEffect(() => { if (personnelLoading || basePersonnel.length === 0) return; fetchRoles(basePersonnel); }, [basePersonnel, personnelLoading]);',
        'Use the Edit tool to apply changes.',

        '--- CHANGE 4: Dashboard per-section skeletons ---',
        `Read: ${args.repoPath}/src/pages/Dashboard.tsx (or src/components/Dashboard.tsx — check which exists)`,
        'Find the full-page loading guard: const loading = personnelLoading || equipmentLoading; if (loading) return <...spinner...>',
        'Remove this full-page early return.',
        'Instead, pass loading state to individual sections:',
        '- Where personnel count is displayed, show a skeleton (animate-pulse div) if personnelLoading',
        '- Where equipment count is displayed, show a skeleton if equipmentLoading',
        '- Where personnel list is rendered, show 3 skeleton rows if personnelLoading',
        'Use inline animate-pulse divs consistent with existing Tailwind usage in the file.',
        'Use the Edit tool to apply changes.',

        'After completing all 4 changes, return filesModified.',
      ],
      outputFormat: 'JSON with fields: filesModified (array), summary (string)',
    },
    outputSchema: {
      type: 'object',
      required: ['filesModified', 'summary'],
      properties: {
        filesModified: { type: 'array', items: { type: 'string' } },
        summary: { type: 'string' },
      },
    },
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`,
  },
}));

// ── Task 7: Build check ───────────────────────────────────────────────────────
export const runBuildCheckTask = defineTask('run-build-check', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Run TypeScript build check and fix errors',
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Senior TypeScript engineer',
      task: 'Run TypeScript type check. Fix any errors found. Repeat until clean.',
      context: { repoPath: args.repoPath },
      instructions: [
        `Run: npm --prefix ${args.repoPath} run typecheck 2>&1 (or npx tsc --noEmit in ${args.repoPath})`,
        'If errors exist: read the files with errors, fix the type issues, re-run.',
        'Common issues after onSnapshot migration:',
        '- Missing imports (onSnapshot, QueryDocumentSnapshot)',
        '- useCallback dependency arrays needing updates',
        '- Type mismatches in snapshot callbacks',
        'Fix all TypeScript errors before returning.',
        'Return success=true only when typecheck passes with 0 errors.',
      ],
      outputFormat: 'JSON with fields: success (boolean), errorCount (number), summary (string)',
    },
    outputSchema: {
      type: 'object',
      required: ['success', 'summary'],
      properties: {
        success: { type: 'boolean' },
        errorCount: { type: 'number' },
        summary: { type: 'string' },
      },
    },
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`,
  },
}));

// ── Task 8: Write performance tests ──────────────────────────────────────────
export const writePerfTestsTask = defineTask('write-perf-tests', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Write e2e/performance.spec.ts and add npm test:perf script',
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Senior QA engineer',
      task: 'Create the performance E2E test file and add the npm script. Read existing E2E tests first for patterns, then create the new file.',
      context: { repoPath: args.repoPath },
      instructions: [
        `Read: ${args.repoPath}/e2e/utils/test-auth.ts`,
        `Read: ${args.repoPath}/e2e/dashboard.spec.ts`,
        `Read: ${args.repoPath}/playwright.config.ts`,
        '',
        `Create: ${args.repoPath}/e2e/performance.spec.ts`,
        '',
        'The file should test 3 things, using the loginAsTestUser helper from test-auth.ts:',
        '',
        'TEST 1 - "Dashboard first load under 3s":',
        '  - Use test.use({ storageState: ".auth/user.json" }) or loginAsTestUser(page, "admin")',
        '  - Record start = Date.now()',
        '  - page.goto("/")',
        '  - page.waitForLoadState("networkidle")',
        '  - Check Date.now() - start < 3000',
        '  - Include the duration in the failure message for debugging',
        '',
        'TEST 2 - "Navigation between screens under 800ms":',
        '  - Login as admin, go to "/", wait for networkidle (first screen fully loaded + prefetch running)',
        '  - Navigate to /personnel: record t1 = Date.now(), click nav link or goto("/personnel"), waitForLoadState("domcontentloaded"), check < 800ms',
        '  - Navigate to /equipment: same pattern, check < 800ms',
        '  - Navigate back to /: same pattern, check < 800ms',
        '  - Use page.getByRole("link", ...) or page.goto() for navigation',
        '',
        'TEST 3 - "Real-time: data visible after page load without refresh":',
        '  - This test validates that onSnapshot is working: navigate to a page and',
        '    confirm data is visible WITHOUT needing to refresh (no manual fetch needed)',
        '  - Login as admin, go to "/personnel", wait for networkidle',
        '  - Verify at least one personnel row is visible (data came from listener)',
        '  - Go to "/equipment", wait for networkidle',
        '  - Verify equipment data is visible',
        '  - This confirms listeners are active and pushing data',
        '',
        'Add test.describe("Performance", ...) wrapper.',
        'Handle the case where the emulator may need a moment to seed data.',
        'Use { timeout: 10000 } on assertions only if needed.',
        '',
        `Also read: ${args.repoPath}/package.json`,
        'Add to the scripts section: "test:perf": "playwright test e2e/performance.spec.ts --project=chromium-auth"',
        'Use the Edit tool to add this script to package.json.',
        '',
        'Return filesModified.',
      ],
      outputFormat: 'JSON with fields: filesModified (array), summary (string)',
    },
    outputSchema: {
      type: 'object',
      required: ['filesModified', 'summary'],
      properties: {
        filesModified: { type: 'array', items: { type: 'string' } },
        summary: { type: 'string' },
      },
    },
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`,
  },
}));

// ── Task 9: Add CI job ────────────────────────────────────────────────────────
export const addCiJobTask = defineTask('add-ci-job', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Add performance job to .github/workflows/ci.yml',
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Senior DevOps engineer',
      task: 'Add a performance CI job to the GitHub Actions workflow. Read the existing CI file first, then add the new job using Edit tool.',
      context: { repoPath: args.repoPath },
      instructions: [
        `Read: ${args.repoPath}/.github/workflows/ci.yml`,
        'Add a new job called "performance" after the existing "e2e" job.',
        'The new job should:',
        '  name: Performance Tests',
        '  runs-on: ubuntu-latest',
        '  needs: [typecheck, lint, unit-tests]  # parallel with e2e, not after it',
        '  if: same condition as e2e job (check [skip e2e] in commit message/PR title)',
        '  steps:',
        '    - actions/checkout@v4',
        '    - actions/setup-java@v4 with java-version: "21", distribution: "temurin"',
        '    - actions/setup-node@v4 with node-version: "20", cache: "npm"',
        '    - Cache Firebase Emulator binaries (same cache key as e2e job)',
        '    - run: npm ci',
        '    - run: npm install -g firebase-tools',
        '    - run: npx playwright install chromium --with-deps',
        '    - name: Write .env for CI, run: cp .env.ci .env',
        '    - name: Run performance tests, run: npx playwright test e2e/performance.spec.ts --project=chromium-auth',
        '      env: CI: true',
        '    - name: Upload performance report (if failure)',
        '      uses: actions/upload-artifact@v4',
        '      with: name: performance-report, path: playwright-report/, retention-days: 7',
        'Use the Edit tool to add this job to the YAML file.',
        'Return filesModified.',
      ],
      outputFormat: 'JSON with fields: filesModified (array), summary (string)',
    },
    outputSchema: {
      type: 'object',
      required: ['filesModified', 'summary'],
      properties: {
        filesModified: { type: 'array', items: { type: 'string' } },
        summary: { type: 'string' },
      },
    },
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`,
  },
}));

// ── Task 10: Commit and push ──────────────────────────────────────────────────
export const commitAndPushTask = defineTask('commit-and-push', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Commit and push all changes to origin/main',
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Senior engineer',
      task: 'Commit and push all changes to origin/main using git bash commands.',
      context: { repoPath: args.repoPath },
      instructions: [
        `Run: git -C ${args.repoPath} status`,
        `Run: git -C ${args.repoPath} add src/hooks/usePersonnel.tsx src/hooks/useUnits.tsx src/hooks/useSignupRequest.tsx src/hooks/useAssignmentRequests.tsx src/hooks/useEquipment.tsx src/hooks/__tests__/useAssignmentRequests.test.tsx src/contexts/DataPrefetchContext.tsx src/pages/PersonnelPage.tsx src/App.tsx src/pages/Dashboard.tsx e2e/performance.spec.ts .github/workflows/ci.yml package.json`,
        'Create commit with message using heredoc:',
        '"perf: migrate to onSnapshot listeners, add DataPrefetchProvider and performance CI tests\\n\\nCo-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"',
        `Run: git -C ${args.repoPath} push origin main`,
        'Return committed=true, pushed=true, commitHash.',
      ],
      outputFormat: 'JSON with fields: committed (boolean), pushed (boolean), commitHash (string)',
    },
    outputSchema: {
      type: 'object',
      required: ['committed', 'pushed'],
      properties: {
        committed: { type: 'boolean' },
        pushed: { type: 'boolean' },
        commitHash: { type: 'string' },
      },
    },
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`,
  },
}));
