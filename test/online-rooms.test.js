import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { sharedCharacter, validInvite } from "../src/online/rooms.js";

const host = "11111111-1111-4111-8111-111111111111";
const player = "22222222-2222-4222-8222-222222222222";
const outsider = "33333333-3333-4333-8333-333333333333";

test("online character sharing excludes character sheets and private local fields", () => {
  assert.deepEqual(sharedCharacter({ name: "Őr", race: "Ember", notes: "titkos", stats: [50] }),
    { character_name: "Őr", character_race: "Ember" });
  assert.equal(validInvite(` ${host.toUpperCase()} `), true);
  assert.equal(validInvite("KALAND12"), false);
});

test("Postgres enforces invitation, membership, author identity, KM authority and scene revisions", async t => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`
    create role authenticated;
    create role anon;
    create schema auth;
    grant usage on schema auth to authenticated, anon;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable
      as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create publication supabase_realtime;
  `);
  for (const id of [host, player, outsider]) await db.query("insert into auth.users values ($1)", [id]);
  await db.exec(await readFile(new URL("../supabase/migrations/20261125000000_online_adventures.sql", import.meta.url), "utf8"));

  async function identify(id) {
    await db.exec("reset role; set role authenticated");
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
  }

  await identify(host);
  const [{ id: room }] = (await db.query("select kaosz_create_room('Köd', 'KM') as id")).rows;
  const [{ code }] = (await db.query("select kaosz_room_invite($1, false) as code", [room])).rows;
  await identify(outsider);
  assert.deepEqual((await db.query("select * from kaosz_rooms")).rows, []);
  assert.deepEqual((await db.query("select * from kaosz_scene")).rows, []);
  await assert.rejects(db.query("select kaosz_room_invite($1, false)", [room]), { code: "42501" });
  await assert.rejects(db.query("insert into kaosz_messages(room_id, body) values ($1, 'Beleszól')", [room]), { code: "42501" });

  await identify(player);
  assert.equal((await db.query("select kaosz_join_room($1, 'Játékos') as id", [code])).rows[0].id, room);
  await db.query("select kaosz_join_room($1, 'Játékos')", [code]);
  assert.equal((await db.query("select * from kaosz_members")).rows.length, 2);
  await assert.rejects(db.query("select kaosz_room_invite($1, true)", [room]), { code: "42501" });
  await assert.rejects(db.query("select kaosz_update_scene($1, 0, 'Átveszem', 3)", [room]), { code: "42501" });
  await assert.rejects(db.query("insert into kaosz_messages(room_id, body, sender_id) values ($1, 'Hamis', $2)", [room, host]),
    { code: "42501" });
  await db.query("insert into kaosz_messages(room_id, body) values ($1, 'Megérkeztem')", [room]);
  const otherMember = await db.query("update kaosz_members set character_name = 'Hamis' where user_id = $1 returning *", [host]);
  assert.equal(otherMember.rows.length, 0);
  await db.query("update kaosz_members set character_name = 'Léna' where user_id = $1", [player]);

  await identify(host);
  assert.deepEqual((await db.query("select sender_id, body from kaosz_messages")).rows,
    [{ sender_id: player, body: "Megérkeztem" }]);
  await db.query("select kaosz_update_scene($1, 0, 'Az erdőben', 4)", [room]);
  await assert.rejects(db.query("select kaosz_update_scene($1, 0, 'Elavult', 5)", [room]), { code: "40001" });
  const [{ code: replacement }] = (await db.query("select kaosz_room_invite($1, true) as code", [room])).rows;
  assert.notEqual(replacement, code);
  await identify(player);
  assert.deepEqual((await db.query("select scene, segment, version from kaosz_scene")).rows,
    [{ scene: "Az erdőben", segment: 4, version: 1 }]);
  assert.deepEqual((await db.query("select character_name from kaosz_members where user_id = $1", [player])).rows,
    [{ character_name: "Léna" }]);
  await identify(outsider);
  assert.deepEqual((await db.query("select * from kaosz_messages")).rows, []);
  await assert.rejects(db.query("select kaosz_join_room($1, 'Későn jött')", [code]), { code: "22023" });
});
