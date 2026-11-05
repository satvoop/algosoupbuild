// The legs of the live RLS probe (scripts/probe-rls.mjs), given ports to the hosted project, so
// they can be tested without a network. A port is a small object:
//   admin:  createUser(email, password) -> id; insertRow(table, row); deleteRows(table, column,
//           value); countRows(table, column, value) -> number; deleteUser(id); userExists(id)
//   anon:   select(table, column, value) -> { rows, error }
//   signIn(email, password) -> a port with the same select, acting as that user
// Admin calls throw on failure; select returns the error, since a refused select is a result.
//
// RLS on is decided by the owner and stranger legs together. PostgREST cannot read pg_class,
// so the probe reads behaviour: with RLS off and a select grant the stranger sees the owner's
// row; with no grant the owner sees nothing. Passing both shows RLS is on and an unrelated new
// user cannot read the owner's row; it does not prove the policy owner-only for every
// relationship (an organisation-membership policy passes too, since the stranger has none).
// Reads only: insert, update and delete policies are not probed.

export const ANON_DENIED = "42501";

const pass = (leg, detail) => ({ leg, ok: true, detail });
const fail = (leg, detail) => ({ leg, ok: false, detail });

function describe(error) {
  return `${error.code ?? "no code"} ${error.message ?? "no message"}`.trim();
}

export function anonLeg(result, opts) {
  const { rows, error } = result;
  if (opts.anonRead) {
    return error ? fail("anon", `select failed (${describe(error)}); --anon read expects it to succeed`) : pass("anon", `select allowed, as --anon read says`);
  }
  if (!error) return fail("anon", `select returned ${rows.length} rows, not 42501: anon can read ${opts.table}`);
  const denied = `permission denied for table ${opts.table}`;
  if (error.code !== ANON_DENIED || !String(error.message).includes(denied)) {
    return fail("anon", `select failed with ${describe(error)}, not ${ANON_DENIED} ${denied}`);
  }
  return pass("anon", `select refused: ${describe(error)}`);
}

export function ownerLeg(result, opts, marker) {
  const { rows, error } = result;
  if (error) return fail("owner", `select failed (${describe(error)}); the owner must see its planted row`);
  if (rows.length !== 1 || rows[0]?.[opts.markerColumn] !== marker) {
    return fail("owner", `saw ${rows.length} rows for its planted marker, not exactly its own row`);
  }
  return pass("owner", "sees its planted row (1 of 1)");
}

export function strangerLeg(result) {
  const { rows, error } = result;
  // An error also returns no rows, so it cannot count as "sees none".
  if (error) return fail("stranger", `select failed (${describe(error)}); a refused query proves nothing about the owner's row`);
  if (rows.length !== 0) return fail("stranger", `sees ${rows.length} of the owner's rows: RLS is off or the policy is not owner-only`);
  return pass("stranger", "sees none of the owner's rows (0, no error)");
}

async function attempt(step, problems) {
  try {
    await step();
  } catch (error) {
    problems.push(error instanceof Error ? error.message : String(error));
  }
}

// Removes what the run planted, then reads back that nothing is left. Every step runs even if
// an earlier one fails, and each failure is named.
export async function cleanupLeg(ports, opts, marker, userIds) {
  const problems = [];
  await attempt(() => ports.admin.deleteRows(opts.table, opts.markerColumn, marker), problems);
  for (const id of userIds) await attempt(() => ports.admin.deleteUser(id), problems);
  await attempt(async () => {
    const left = await ports.admin.countRows(opts.table, opts.markerColumn, marker);
    if (left !== 0) problems.push(`${left} planted rows left in ${opts.table} (marker ${marker})`);
  }, problems);
  for (const id of userIds) {
    await attempt(async () => {
      if (await ports.admin.userExists(id)) problems.push(`probe user ${id} left behind`);
    }, problems);
  }
  if (problems.length > 0) return fail("cleanup", problems.join("; "));
  return pass("cleanup", `planted row and ${userIds.length} users removed (read back: none left)`);
}

async function plantAndRead(ports, opts, run, userIds) {
  const legs = [];
  const ownerId = await ports.admin.createUser(run.owner.email, run.owner.password);
  userIds.push(ownerId);
  userIds.push(await ports.admin.createUser(run.stranger.email, run.stranger.password));
  await ports.admin.insertRow(opts.table, { ...opts.row, [opts.ownerColumn]: ownerId, [opts.markerColumn]: run.marker });
  legs.push(anonLeg(await ports.anon.select(opts.table, opts.markerColumn, run.marker), opts));
  const owner = await ports.signIn(run.owner.email, run.owner.password);
  legs.push(ownerLeg(await owner.select(opts.table, opts.markerColumn, run.marker), opts, run.marker));
  const stranger = await ports.signIn(run.stranger.email, run.stranger.password);
  legs.push(strangerLeg(await stranger.select(opts.table, opts.markerColumn, run.marker)));
  return legs;
}

// run: { marker, owner: { email, password }, stranger: { email, password } }. Returns the legs
// in order, cleanup last, and setupError when the run could not plant or read (the cleanup leg
// still runs and reports).
export async function runProbe(ports, opts, run) {
  const userIds = [];
  let legs = [];
  let setupError = null;
  try {
    legs = await plantAndRead(ports, opts, run, userIds);
  } catch (error) {
    setupError = error instanceof Error ? error.message : String(error);
  }
  legs.push(await cleanupLeg(ports, opts, run.marker, userIds));
  return { legs, setupError };
}
