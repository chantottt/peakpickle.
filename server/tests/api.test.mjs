import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { after, afterEach, before, beforeEach, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import rawRequest from 'supertest';
import { User } from '../dist/models/User.js';
import { Player } from '../dist/models/Player.js';
import { hashPassword, signToken } from '../dist/services/authService.js';
let adminId;
const csrfToken = 'a'.repeat(64);
function request(app) {
  const client = rawRequest(app);
  return Object.fromEntries(
    ['get', 'post', 'patch', 'delete'].map((method) => [
      method,
      (path) =>
        client[method](path)
          .set('Cookie', ['pp_session=' + signToken(adminId, 0), 'pp_csrf=' + csrfToken])
          .set('X-CSRF-Token', csrfToken)
          .set('Origin', 'http://localhost:5173'),
    ]),
  );
}
process.env.JWT_SECRET = 'temporary-test-secret-with-at-least-32-characters';
let adminHash;

import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { app } from '../dist/app.js';
import { seedData, seedId } from '../dist/seed/data.js';
import { today, nextFreeTime, clock, currentTime } from '../dist/utils/time.js';
async function anonymous() {
  const agent = rawRequest.agent(app);
  const { body } = await agent.get('/api/auth/csrf').expect(200);
  return { agent, token: body.csrfToken };
}
async function member(email = 'member@test.local') {
  const client = await anonymous();
  await client.agent
    .post('/api/auth/signup')
    .set('X-CSRF-Token', client.token)
    .send({ name: 'Test Member', email, password: 'TestPassword!2026' })
    .expect(201);
  const me = await client.agent.get('/api/auth/me').expect(200);
  return { ...client, me: me.body };
}
let database;
let testTime;
const setTestTime = (value) => {
  testTime = new Date(value);
};
const id = (value) => seedId(value).toString();
const reservation = (extra = {}) => ({
  playerId: id(118),
  courtId: id(200),
  reservationDate: today(),
  startTime: '09:00',
  endTime: '10:00',
  ...extra,
});
before(async () => {
  process.env.MONGOMS_DOWNLOAD_DIR = fileURLToPath(
    new URL('../../.mongodb-binaries', import.meta.url),
  );
  database = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
    binary: { version: '7.0.24' },
  });
  await mongoose.connect(database.getUri('peakpickle_tests'));
  await User.init();
  await Player.init();
  adminHash = await hashPassword('TestPassword!2026');
});
beforeEach(async (context) => {
  process.env.BUSINESS_TIMEZONE = 'Asia/Manila';
  // Keep driver/session clocks real for auth tests; only sports fixtures need a fixed game time.
  if (
    !/signup|login, refresh|CSRF|members cannot|member bookings|email changes|public landing|current roles|concurrent signup|authentication rate/i.test(
      context.name,
    )
  ) {
    setTestTime('2026-10-05T04:00:00Z');
    mock.method(clock, 'now', () => new Date(testTime));
  }
  await seedData(true);
  adminId = String(
    (await User.create({ email: 'admin@test.local', passwordHash: adminHash, role: 'admin' }))._id,
  );
});
afterEach(() => mock.restoreAll());
after(async () => {
  await mongoose.disconnect();
  await database?.stop();
});

test('inactive players can cancel reservations and release their slots', async () => {
  const created = await request(app).post('/api/reservations').send(reservation()).expect(201);
  await request(app)
    .patch(`/api/players/${id(118)}`)
    .send({ isActive: false })
    .expect(200);
  await request(app)
    .patch(`/api/reservations/${created.body._id}`)
    .send({ status: 'cancelled' })
    .expect(200);
  await request(app)
    .post('/api/reservations')
    .send(reservation({ playerId: id(119) }))
    .expect(201);
});

test('scheduled matches can be cancelled after deactivation or court maintenance', async () => {
  const court = await request(app)
    .post('/api/courts')
    .send({
      name: 'Cancellation Court',
      courtNumber: 99,
      location: 'Test Club',
      type: 'indoor',
      openingTime: '06:00',
      closingTime: '22:00',
    })
    .expect(201);
  const match = await request(app)
    .post('/api/matches')
    .send({
      courtId: court.body._id,
      players: [id(118), id(119)],
      playType: 'singles',
      scheduledAt: currentTime().toISOString(),
    })
    .expect(201);
  await request(app)
    .patch(`/api/players/${id(118)}`)
    .send({ isActive: false })
    .expect(200);
  await request(app)
    .patch(`/api/courts/${court.body._id}`)
    .send({ status: 'maintenance' })
    .expect(200);
  await request(app)
    .patch(`/api/matches/${match.body._id}`)
    .send({ status: 'cancelled' })
    .expect(200);
});

for (const queued of [false, true]) {
  test(`${queued ? 'queued' : 'scheduled'} starts respect bookings, their holders, and opening hours`, async () => {
    const match = queued
      ? null
      : await request(app)
          .post('/api/matches')
          .send({
            courtId: id(200),
            players: [id(102), id(103)],
            playType: 'singles',
            scheduledAt: currentTime().toISOString(),
          })
          .expect(201);
    if (queued)
      await request(app)
        .post(`/api/queue-entries/courts/${id(200)}/call-next`)
        .expect(200);
    const start = () =>
      queued
        ? request(app).post(`/api/queue-entries/courts/${id(200)}/start-match`)
        : request(app).patch(`/api/matches/${match.body._id}`).send({ status: 'ongoing' });
    const booking = await request(app)
      .post('/api/reservations')
      .send(
        reservation({
          startTime: '12:00',
          endTime: '13:00',
        }),
      )
      .expect(201);
    const blocked = await start().expect(400);
    assert.match(blocked.body.message, /reserved for another player/);
    const court = await request(app)
      .get(`/api/courts/${id(200)}`)
      .expect(200);
    assert.equal(court.body.status, 'available');
    await request(app)
      .patch(`/api/reservations/${booking.body._id}`)
      .send({ playerId: id(102) })
      .expect(200);
    setTestTime(new Date('2026-10-04T21:00:00Z').getTime()); // 05:00 Manila
    const closed = await start().expect(400);
    assert.match(closed.body.message, /operating hours/);
    setTestTime(new Date('2026-10-05T04:00:00Z').getTime());
    await start().expect(queued ? 201 : 200);
  });
}

test('next availability skips fully booked days and adjacent reservations', async () => {
  const rows = [
    { reservationDate: '2026-10-06', startTime: '06:00', endTime: '22:00' },
    { reservationDate: '2026-10-07', startTime: '07:00', endTime: '09:00' },
    { reservationDate: '2026-10-07', startTime: '06:00', endTime: '07:00' },
  ];
  assert.equal(nextFreeTime('06:00', '22:00', rows, '22:00'), '2026-10-07T09:00:00+08:00');
  await request(app)
    .post('/api/reservations')
    .send(
      reservation({
        reservationDate: '2026-10-06',
        startTime: '06:00',
        endTime: '09:00',
      }),
    )
    .expect(201);
  setTestTime(new Date('2026-10-05T14:00:00Z').getTime());
  const court = await request(app)
    .get(`/api/courts/${id(200)}`)
    .expect(200);
  assert.equal(court.body.nextAvailableTime, '2026-10-06T09:00:00+08:00');
});
test('doubles queue preserves four-player groups through skips and result recording', async () => {
  const called = await request(app)
    .post(`/api/queue-entries/courts/${id(200)}/call-next`)
    .send({ playType: 'doubles' })
    .expect(200);
  assert.deepEqual(
    called.body.map((row) => row._id),
    [id(602), id(603), id(604), id(605)],
  );
  await request(app)
    .patch(`/api/queue-entries/${id(602)}`)
    .send({ status: 'skipped' })
    .expect(200);
  await request(app)
    .post(`/api/queue-entries/courts/${id(200)}/start-match`)
    .expect(400);
  await request(app)
    .patch(`/api/queue-entries/${id(606)}`)
    .send({ status: 'called', playType: 'singles' })
    .expect(400);
  await request(app)
    .patch(`/api/queue-entries/${id(606)}`)
    .send({ status: 'called', playType: 'doubles' })
    .expect(200);
  const match = await request(app)
    .post(`/api/queue-entries/courts/${id(200)}/start-match`)
    .expect(201);
  assert.equal(match.body.playType, 'doubles');
  assert.deepEqual(
    match.body.players.map((player) => player._id),
    [id(103), id(104), id(105), id(106)],
  );
  const result = await request(app)
    .post('/api/match-results')
    .send({ matchId: match.body._id, teamOneScore: 11, teamTwoScore: 8 })
    .expect(201);
  assert.deepEqual(result.body.winnerPlayerIds, [id(103), id(104)]);
  const completed = await request(app)
    .get(`/api/queue-entries?courtId=${id(200)}&status=completed`)
    .expect(200);
  assert.equal(completed.body.length, 4);
});

test('queue rejects unsupported play types and insufficient doubles players', async () => {
  await request(app)
    .post(`/api/queue-entries/courts/${id(200)}/call-next`)
    .send({ playType: 'triples' })
    .expect(400);
  await request(app)
    .post(`/api/queue-entries/courts/${id(203)}/call-next`)
    .send({ playType: 'doubles' })
    .expect(400);
});

test('activity match filter only returns the selected player’s matches', async () => {
  const response = await request(app)
    .get(`/api/matches?playerId=${id(114)}`)
    .expect(200);
  assert.ok(response.body.length > 0);
  assert.ok(response.body.every((match) => match.players.some((player) => player._id === id(114))));
  await request(app).get('/api/matches?playerId=invalid').expect(400);
});

test('all read endpoints return real MongoDB records and populated relationships', async () => {
  const expected = { players: 20, courts: 6, reservations: 35, 'queue-entries': 14, matches: 47 };
  for (const [resource, count] of Object.entries(expected)) {
    const { body } = await request(app).get(`/api/${resource}`).expect(200);
    assert.equal(body.length, count);
  }
  for (const path of [
    `players/${id(100)}`,
    `courts/${id(200)}`,
    `reservations/${id(300)}`,
    `matches/${id(400)}`,
    `match-results/${id(500)}`,
  ])
    await request(app).get(`/api/${path}`).expect(200);
  const detail = await request(app)
    .get(`/api/reservations/${id(300)}`)
    .expect(200);
  assert.equal(detail.body.playerId.name, 'Miguel Santos');
  await request(app).get('/api/health').expect(200);
});
test('player CRUD, duplicate email validation, filters and safe related-record deletes', async () => {
  const payload = {
    name: 'Test Player',
    email: 'test@example.com',
    skillLevel: 'beginner',
    preferredPlay: 'both',
  };
  const created = await request(app).post('/api/players').send(payload).expect(201);
  await request(app).post('/api/players').send(payload).expect(400);
  await request(app)
    .patch(`/api/players/${created.body._id}`)
    .send({ name: 'Updated Player' })
    .expect(200);
  const found = await request(app)
    .get('/api/players?search=Updated&skillLevel=beginner&preferredPlay=both')
    .expect(200);
  assert.equal(found.body.length, 1);
  await request(app).delete(`/api/players/${created.body._id}`).expect(200);
  await request(app).get(`/api/players/${created.body._id}`).expect(404);
  await request(app)
    .delete(`/api/players/${id(100)}`)
    .expect(400);
  await request(app)
    .post('/api/players')
    .send({ ...payload, skillLevel: 'expert' })
    .expect(400);
});
test('court CRUD and operating-hour validation protect existing bookings', async () => {
  const payload = {
    name: 'Test Court',
    courtNumber: 99,
    location: 'Taguig City',
    type: 'indoor',
    openingTime: '06:00',
    closingTime: '22:00',
  };
  const created = await request(app).post('/api/courts').send(payload).expect(201);
  await request(app)
    .patch(`/api/courts/${created.body._id}`)
    .send({ name: 'Updated Court' })
    .expect(200);
  await request(app).get('/api/courts?search=Updated&type=indoor&status=available').expect(200);
  await request(app).delete(`/api/courts/${created.body._id}`).expect(200);
  await request(app)
    .delete(`/api/courts/${id(200)}`)
    .expect(400);
  await request(app)
    .patch(`/api/courts/${id(200)}`)
    .send({ closingTime: '16:00' })
    .expect(400);
  await request(app)
    .patch(`/api/courts/${id(200)}`)
    .send({ status: 'maintenance' })
    .expect(400);
  await request(app)
    .post('/api/courts')
    .send({ ...payload, openingTime: '23:00' })
    .expect(400);
});
test('reservation overlap, adjacency, edit exclusions and operating hours', async () => {
  const created = await request(app).post('/api/reservations').send(reservation()).expect(201);
  const conflict = await request(app)
    .post('/api/reservations')
    .send(reservation({ startTime: '09:30', endTime: '10:30' }))
    .expect(400);
  assert.equal(conflict.body.message, 'Court is already reserved during the selected time.');
  const adjacent = await request(app)
    .post('/api/reservations')
    .send(reservation({ startTime: '10:00', endTime: '11:00' }))
    .expect(201);
  await request(app)
    .patch(`/api/reservations/${created.body._id}`)
    .send({ startTime: '09:00', endTime: '10:00', status: 'confirmed' })
    .expect(200);
  await request(app)
    .patch(`/api/reservations/${created.body._id}`)
    .send({ endTime: '10:30' })
    .expect(400);
  const availability = await request(app)
    .get(`/api/courts/availability?date=${today()}&startTime=09:00&endTime=10:00`)
    .expect(200);
  assert.ok(!availability.body.some((court) => court._id === id(200)));
  const excluded = await request(app)
    .get(
      `/api/courts/availability?date=${today()}&startTime=09:00&endTime=10:00&excludeReservationId=${created.body._id}`,
    )
    .expect(200);
  assert.ok(excluded.body.some((court) => court._id === id(200)));
  await request(app)
    .post('/api/reservations')
    .send(reservation({ startTime: '05:00', endTime: '06:00' }))
    .expect(400);
  await request(app)
    .post('/api/reservations')
    .send(reservation({ courtId: id(204) }))
    .expect(400);
  await request(app)
    .post('/api/reservations')
    .send(reservation({ startTime: '11:00', endTime: '10:00' }))
    .expect(400);
  await request(app)
    .post('/api/reservations')
    .send(reservation({ reservationDate: '2026-02-30' }))
    .expect(400);
  await request(app)
    .post('/api/reservations')
    .send(reservation({ playerId: id(9999) }))
    .expect(400);
  await request(app).delete(`/api/reservations/${adjacent.body._id}`).expect(200);
});
test('simultaneous reservations cannot double-book a court', async () => {
  const responses = await Promise.all([
    request(app).post('/api/reservations').send(reservation()),
    request(app)
      .post('/api/reservations')
      .send(reservation({ playerId: id(119) })),
  ]);
  assert.deepEqual(responses.map((response) => response.status).sort(), [201, 400]);
});
test('reservation transitions reject reversals and cancellation releases capacity', async () => {
  const created = await request(app).post('/api/reservations').send(reservation()).expect(201);
  const path = `/api/reservations/${created.body._id}`;
  await request(app).patch(path).send({ status: 'completed' }).expect(400);
  await request(app).patch(path).send({ status: 'confirmed' }).expect(200);
  await request(app).patch(path).send({ status: 'cancelled' }).expect(200);
  await request(app).patch(path).send({ status: 'confirmed' }).expect(400);
  await request(app).post('/api/reservations').send(reservation()).expect(201);
});
test('queue summary derives positions and wait estimates without storing them', async () => {
  const summary = await request(app)
    .get(`/api/queue-entries/summary?courtId=${id(200)}`)
    .expect(200);
  const entries = summary.body[0].entries;
  assert.equal(entries[0].position, 1);
  assert.equal(entries[1].estimatedWait, summary.body[0].averageMatchDuration);
  const stored = await mongoose.connection.collection('queueentries').findOne({ _id: seedId(602) });
  assert.equal(stored.position, undefined);
  await request(app)
    .patch(`/api/queue-entries/${id(604)}`)
    .send({ status: 'called' })
    .expect(400);
  await request(app)
    .patch(`/api/queue-entries/${id(602)}`)
    .send({ status: 'playing' })
    .expect(400);
});
test('join, duplicate prevention, cancellation and delete queue operations', async () => {
  const joined = await request(app)
    .post('/api/queue-entries')
    .send({ playerId: id(119), courtId: id(200) })
    .expect(201);
  await request(app)
    .post('/api/queue-entries')
    .send({ playerId: id(119), courtId: id(202) })
    .expect(400);
  await request(app)
    .patch(`/api/queue-entries/${joined.body._id}`)
    .send({ status: 'cancelled' })
    .expect(200);
  await request(app).delete(`/api/queue-entries/${joined.body._id}`).expect(200);
  await request(app)
    .delete(`/api/queue-entries/${id(600)}`)
    .expect(400);
  await request(app)
    .post('/api/queue-entries')
    .send({ playerId: id(119), courtId: id(204) })
    .expect(400);
});
test('FCFS call-next, skip, start and result update court, match and queue atomically', async () => {
  const called = await request(app)
    .post(`/api/queue-entries/courts/${id(200)}/call-next`)
    .expect(200);
  assert.deepEqual(
    called.body.map((row) => row._id),
    [id(602), id(603)],
  );
  await request(app)
    .patch(`/api/queue-entries/${id(602)}`)
    .send({ status: 'skipped' })
    .expect(200);
  await request(app)
    .patch(`/api/queue-entries/${id(604)}`)
    .send({ status: 'called' })
    .expect(200);
  const started = await request(app)
    .post(`/api/queue-entries/courts/${id(200)}/start-match`)
    .expect(201);
  assert.equal(started.body.status, 'ongoing');
  await request(app)
    .post(`/api/queue-entries/courts/${id(200)}/start-match`)
    .expect(400);
  await request(app)
    .post('/api/match-results')
    .send({
      matchId: started.body._id,
      teamOneScore: 11,
      teamTwoScore: 8,
      winnerPlayerIds: [id(104)],
    })
    .expect(400);
  const result = await request(app)
    .post('/api/match-results')
    .send({ matchId: started.body._id, teamOneScore: 11, teamTwoScore: 8 })
    .expect(201);
  assert.deepEqual(result.body.winnerPlayerIds, [id(103)]);
  await request(app).get(`/api/match-results/${result.body._id}`).expect(200);
  const summary = await request(app)
    .get(`/api/queue-entries/summary?courtId=${id(200)}`)
    .expect(200);
  assert.equal(summary.body[0].court.status, 'available');
  assert.equal(summary.body[0].currentMatch, null);
  const entries = await request(app)
    .get(`/api/queue-entries?courtId=${id(200)}&status=completed`)
    .expect(200);
  assert.equal(entries.body.length, 2);
  await request(app)
    .post('/api/match-results')
    .send({ matchId: started.body._id, teamOneScore: 11, teamTwoScore: 8 })
    .expect(400);
});
test('match CRUD, status rules, score validation and rankings from results', async () => {
  const payload = {
    courtId: id(203),
    players: [id(118), id(119)],
    playType: 'singles',
    scheduledAt: currentTime().toISOString(),
  };
  const created = await request(app).post('/api/matches').send(payload).expect(201);
  const path = `/api/matches/${created.body._id}`;
  await request(app).patch(path).send({ playType: 'doubles' }).expect(400);
  await request(app).patch(path).send({ status: 'completed' }).expect(400);
  const before = (await request(app).get('/api/players/rankings')).body.find(
    (player) => player._id === id(118),
  );
  await request(app).patch(path).send({ status: 'ongoing' }).expect(200);
  await request(app).patch(path).send({ status: 'scheduled' }).expect(400);
  await request(app).delete(path).expect(400);
  for (const scores of [
    [11, 11],
    [-1, 0],
    [11.5, 8],
  ])
    await request(app)
      .post('/api/match-results')
      .send({ matchId: created.body._id, teamOneScore: scores[0], teamTwoScore: scores[1] })
      .expect(400);
  const result = await request(app)
    .post('/api/match-results')
    .send({ matchId: created.body._id, teamOneScore: 11, teamTwoScore: 9 })
    .expect(201);
  const after = (await request(app).get('/api/players/rankings')).body.find(
    (player) => player._id === id(118),
  );
  assert.equal(after.wins, before.wins + 1);
  assert.equal(after.matchesPlayed, before.matchesPlayed + 1);
  await request(app).delete(path).expect(200);
  await request(app).get(`/api/match-results/${result.body._id}`).expect(404);
  await request(app)
    .post('/api/matches')
    .send({ ...payload, players: [id(118), id(118)] })
    .expect(400);
  const cancelled = await request(app).post('/api/matches').send(payload).expect(201);
  await request(app)
    .patch(`/api/matches/${cancelled.body._id}`)
    .send({ status: 'cancelled' })
    .expect(200);
});
test('matching scores are 60/30/10 and rankings obey wins then win rate', async () => {
  const matches = await request(app)
    .get('/api/players/matches?skillLevel=intermediate&playType=doubles&availableTime=evening')
    .expect(200);
  assert.equal(matches.body[0].matchPercentage, 100);
  assert.ok(
    matches.body.every(
      (player, index, array) =>
        !index || array[index - 1].matchPercentage >= player.matchPercentage,
    ),
  );
  const ranks = await request(app).get('/api/players/rankings').expect(200);
  assert.ok(
    ranks.body.every((player, index, array) => !index || array[index - 1].wins >= player.wins),
  );
  await request(app).get('/api/players/matches?skillLevel=expert').expect(400);
  const both = matches.body.find((player) => player.preferredPlay === 'both');
  assert.equal(both.matchPercentage, 30);
});
test('two courts cannot start matches with the same player simultaneously', async () => {
  const base = {
    players: [id(118), id(119)],
    playType: 'singles',
    scheduledAt: currentTime().toISOString(),
  };
  const one = await request(app)
    .post('/api/matches')
    .send({ ...base, courtId: id(200) })
    .expect(201);
  const two = await request(app)
    .post('/api/matches')
    .send({ ...base, courtId: id(203) })
    .expect(201);
  const results = await Promise.all([
    request(app).patch(`/api/matches/${one.body._id}`).send({ status: 'ongoing' }),
    request(app).patch(`/api/matches/${two.body._id}`).send({ status: 'ongoing' }),
  ]);
  assert.deepEqual(results.map((result) => result.status).sort(), [200, 400]);
});
test('statistics and dashboard are computed from records', async () => {
  const stats = await request(app).get('/api/statistics').expect(200);
  assert.equal(stats.body.totalMatches, 42);
  assert.equal(
    stats.body.courtUsage.reduce((sum, court) => sum + court.matches, 0),
    42,
  );
  assert.equal(stats.body.matchesByDay.length, 7);
  assert.equal(stats.body.peakHours.length, 24);
  const dashboard = await request(app).get('/api/statistics/dashboard').expect(200);
  assert.equal(dashboard.body.totalPlayers, 20);
  assert.equal(dashboard.body.courts.length, 6);
  assert.equal(dashboard.body.recentMatches.length, 5);
});
test('malformed IDs, missing records, invalid JSON and 404s share JSON errors', async () => {
  for (const resource of ['players', 'courts', 'reservations', 'matches', 'match-results']) {
    const bad = await request(app).get(`/api/${resource}/bad-id`).expect(400);
    assert.equal(typeof bad.body.message, 'string');
    const missing = await request(app)
      .get(`/api/${resource}/${id(99999)}`)
      .expect(404);
    assert.equal(missing.body.message, 'Record not found');
  }
  await request(app)
    .get('/api/courts/availability?date=bad&startTime=09:00&endTime=10:00')
    .expect(400);
  const unknown = await request(app).get('/api/no-such-resource').expect(404);
  assert.equal(unknown.body.message, 'Record not found');
  await request(app)
    .post('/api/players')
    .set('Content-Type', 'application/json')
    .send('{broken')
    .expect(400);
});

// Authentication and authorization regression coverage uses the same temporary replica set.
test('signup is normalized, atomic, member-only and never claims an existing sports profile', async () => {
  const c = await anonymous();
  const payload = {
    name: 'New Member',
    email: '  NEW@Test.local  ',
    password: 'TestPassword!2026',
  };
  await c.agent
    .post('/api/auth/signup')
    .set('X-CSRF-Token', c.token)
    .send({ ...payload, role: 'admin' })
    .expect(400);
  assert.equal(await User.countDocuments({ email: 'new@test.local' }), 0);
  await c.agent.post('/api/auth/signup').set('X-CSRF-Token', c.token).send(payload).expect(201);
  const me = (await c.agent.get('/api/auth/me').expect(200)).body;
  assert.equal(me.role, 'member');
  assert.equal(me.email, 'new@test.local');
  assert.equal(me.player.email, me.email);
  assert.equal(me.playerId, me.player._id);
  assert.equal(me.passwordHash, undefined);
  await c.agent.post('/api/auth/signup').set('X-CSRF-Token', c.token).send(payload).expect(409);
  const legacy = await Player.findById(id(118));
  await c.agent
    .post('/api/auth/signup')
    .set('X-CSRF-Token', c.token)
    .send({ ...payload, email: legacy.email })
    .expect(409);
  assert.equal(await User.countDocuments({ playerId: legacy._id }), 0);
});
test('login, refresh restoration, invalid passwords, expiry, signatures, inactive users and global logout', async () => {
  const c = await member();
  await c.agent.get('/api/auth/me').expect(200);
  const user = await User.findById(c.me._id).select('+passwordHash');
  assert.ok(user.passwordHash.startsWith('scrypt:'));
  assert.ok(!user.passwordHash.includes('TestPassword'));
  await c.agent
    .post('/api/auth/login')
    .set('X-CSRF-Token', c.token)
    .send({ email: c.me.email, password: 'WrongPassword!2026' })
    .expect(401);
  for (const token of [
    'garbage',
    signToken(c.me._id, 0, -1),
    signToken(c.me._id, 0).slice(0, -8) + 'tampered',
    signToken(c.me._id, 999),
  ]) {
    await rawRequest(app)
      .get('/api/auth/me')
      .set('Cookie', 'pp_session=' + token)
      .expect(401);
  }
  await User.updateOne({ _id: c.me._id }, { isActive: false });
  await c.agent.get('/api/auth/me').expect(401);
  await c.agent
    .post('/api/auth/login')
    .set('X-CSRF-Token', c.token)
    .send({ email: c.me.email, password: 'TestPassword!2026' })
    .expect(401);
  await User.updateOne({ _id: c.me._id }, { isActive: true });
  await c.agent
    .post('/api/auth/login')
    .set('X-CSRF-Token', c.token)
    .send({ email: c.me.email, password: 'TestPassword!2026' })
    .expect(200);
  const captured = signToken(c.me._id, 0);
  await c.agent.post('/api/auth/logout').set('X-CSRF-Token', c.token).expect(200);
  await c.agent.get('/api/auth/me').expect(401);
  await rawRequest(app)
    .get('/api/auth/me')
    .set('Cookie', 'pp_session=' + captured)
    .expect(401);
  const admin = await anonymous();
  await admin.agent
    .post('/api/auth/login')
    .set('X-CSRF-Token', admin.token)
    .send({ email: 'admin@test.local', password: 'TestPassword!2026' })
    .expect(200);
  assert.equal((await admin.agent.get('/api/auth/me')).body.role, 'admin');
});
test('CSRF is required for signup/login and every authenticated mutation', async () => {
  await rawRequest(app)
    .post('/api/auth/login')
    .send({ email: 'admin@test.local', password: 'TestPassword!2026' })
    .expect(403);
  const c = await member();
  await c.agent
    .post('/api/queue-entries')
    .send({ courtId: id(200) })
    .expect(403);
  await c.agent
    .post('/api/queue-entries')
    .set('X-CSRF-Token', c.token)
    .set('Origin', 'https://evil.example')
    .send({ courtId: id(200) })
    .expect(403);
});
test('members cannot escalate, manage sports, access others private records or impersonate players', async () => {
  const c = await member();
  const send = (method, path, body) =>
    c.agent[method](path).set('X-CSRF-Token', c.token).send(body);
  for (const path of [
    '/api/courts',
    '/api/players',
    '/api/matches',
    '/api/match-results',
    `/api/queue-entries/courts/${id(200)}/call-next`,
    `/api/queue-entries/courts/${id(200)}/start-match`,
  ])
    await send('post', path, {}).expect(403);
  await c.agent.get('/api/statistics').expect(403);
  await c.agent.get('/api/statistics/dashboard').expect(403);
  await send('patch', `/api/players/${c.me.playerId}`, { role: 'admin' }).expect(403);
  await send('patch', `/api/players/${id(118)}`, { name: 'Impersonation' }).expect(403);
  await send('post', '/api/reservations', reservation()).expect(403);
  await send('post', '/api/queue-entries', { playerId: id(118), courtId: id(200) }).expect(403);
  await c.agent.get(`/api/reservations/${id(300)}`).expect(404);
  await c.agent.get(`/api/matches/${id(400)}`).expect(404);
  assert.deepEqual((await c.agent.get('/api/reservations?playerId=' + id(102))).body, []);
  const profile = (await c.agent.get('/api/players/' + id(102))).body;
  assert.equal(profile.email, undefined);
  assert.deepEqual(profile.recentMatches, []);
  const ranks = (await c.agent.get('/api/players/rankings')).body;
  assert.ok(ranks.filter((p) => p._id !== c.me.playerId).every((p) => !p.email));
});
test('member bookings are pending, owned, editable and cancellable; queue cancellation preserves order', async () => {
  const c = await member();
  const send = (method, path, body) =>
    c.agent[method](path).set('X-CSRF-Token', c.token).send(body);
  const input = reservation();
  delete input.playerId;
  await send('post', '/api/reservations', { ...input, status: 'confirmed' }).expect(403);
  const booking = (await send('post', '/api/reservations', input).expect(201)).body;
  assert.equal(booking.playerId._id, c.me.playerId);
  assert.equal(booking.status, 'pending');
  await send('patch', '/api/reservations/' + booking._id, { endTime: '09:30' }).expect(200);
  await send('patch', '/api/reservations/' + booking._id, { status: 'confirmed' }).expect(403);
  const other = await member('other@test.local');
  await other.agent
    .patch('/api/reservations/' + booking._id)
    .set('X-CSRF-Token', other.token)
    .send({ status: 'cancelled' })
    .expect(404);
  await request(app)
    .patch('/api/reservations/' + booking._id)
    .send({ status: 'confirmed' })
    .expect(200);
  await send('patch', '/api/reservations/' + booking._id, { endTime: '10:30' }).expect(403);
  await send('patch', '/api/reservations/' + booking._id, { status: 'cancelled' }).expect(200);
  const queued = (await send('post', '/api/queue-entries', { courtId: id(200) }).expect(201)).body;
  await send('patch', '/api/queue-entries/' + queued._id, { status: 'called' }).expect(403);
  await other.agent
    .patch('/api/queue-entries/' + queued._id)
    .set('X-CSRF-Token', other.token)
    .send({ status: 'cancelled' })
    .expect(404);
  await send('patch', '/api/queue-entries/' + queued._id, { status: 'cancelled' }).expect(200);
});
test('email changes are atomic, unique and invalidate existing sessions; linked sports profiles cannot be deleted or reseeded accidentally', async () => {
  const c = await member();
  await c.agent
    .patch('/api/players/' + c.me.playerId)
    .set('X-CSRF-Token', c.token)
    .send({ email: 'changed@test.local' })
    .expect(200);
  assert.equal((await User.findById(c.me._id)).email, 'changed@test.local');
  assert.equal((await Player.findById(c.me.playerId)).email, 'changed@test.local');
  await c.agent.get('/api/auth/me').expect(401);
  await request(app)
    .delete('/api/players/' + c.me.playerId)
    .expect(400);
  await assert.rejects(seedData(), /Accounts exist/);
});
test('public landing endpoints never include private bookings or contact data', async () => {
  await rawRequest(app).get('/api/statistics/dashboard').expect(401);
  const courts = (await rawRequest(app).get('/api/public/courts').expect(200)).body;
  assert.ok(courts.every((court) => !court.schedule && !court.nextSchedule));
  const ranks = (await rawRequest(app).get('/api/public/rankings').expect(200)).body;
  assert.ok(ranks.every((player) => !player.email && typeof player._id === 'string'));
  const summary = (await rawRequest(app).get('/api/public/summary').expect(200)).body;
  assert.equal(summary.upcomingReservations, undefined);
  assert.equal(summary.recentMatches, undefined);
});

test('current roles and active status override old JWTs; member court reads hide others reservations', async () => {
  const c = await member();
  const courts = (await c.agent.get('/api/courts').expect(200)).body;
  assert.ok(
    courts.every(
      (court) =>
        court.schedule.every((booking) => booking.playerId._id === c.me.playerId) &&
        !court.nextSchedule,
    ),
  );
  await c.agent
    .get(
      '/api/courts/availability?date=' +
        today() +
        '&startTime=09:00&endTime=10:00&excludeReservationId=' +
        id(300),
    )
    .expect(403);
  await User.updateOne({ _id: adminId }, { role: 'member', playerId: seedId(118) });
  await request(app).post('/api/courts').send({}).expect(403);
  await User.updateOne({ _id: adminId }, { role: 'admin', isActive: false });
  await request(app).get('/api/statistics').expect(401);
});

test('concurrent signup leaves exactly one account and player with no orphan profile', async () => {
  const clients = await Promise.all([anonymous(), anonymous()]);
  const input = {
    name: 'Concurrent Member',
    email: 'race@test.local',
    password: 'TestPassword!2026',
  };
  const responses = await Promise.all(
    clients.map((c) => c.agent.post('/api/auth/signup').set('X-CSRF-Token', c.token).send(input)),
  );
  assert.equal(responses.filter((response) => response.status === 201).length, 1);
  assert.ok(responses.every((response) => [201, 400, 409].includes(response.status)));
  assert.equal(await User.countDocuments({ email: input.email }), 1);
  assert.equal(await Player.countDocuments({ email: input.email }), 1);
  const user = await User.findOne({ email: input.email });
  assert.equal(String(user.playerId), String((await Player.findOne({ email: input.email }))._id));
});

test('authentication rate limiting rejects excess login and signup attempts', async () => {
  const c = await anonymous();
  let limited = false;
  // Invalid input avoids expensive password derivation but still counts as an auth attempt.
  for (let index = 0; index < 31; index++) {
    const response = await c.agent.post('/api/auth/login').set('X-CSRF-Token', c.token).send({});
    assert.ok([400, 429].includes(response.status));
    if (response.status === 429) {
      limited = true;
      break;
    }
  }
  assert.ok(limited);
  await c.agent.post('/api/auth/signup').set('X-CSRF-Token', c.token).send({}).expect(429);
});

test('controlled provisioning creates the first admin and links only an explicitly verified existing player', async () => {
  await User.deleteMany({});
  const run = promisify(execFile);
  const provision = async (overrides = {}) =>
    run(process.execPath, ['dist/seed/createAccount.js'], {
      cwd: fileURLToPath(new URL('../', import.meta.url)),
      env: {
        ...process.env,
        MONGO_URI: database.getUri('peakpickle_tests'),
        ADMIN_EMAIL: 'first@test.local',
        ADMIN_PASSWORD: 'ProvisionPassword!2026',
        LINK_PLAYER_ID: '',
        ...overrides,
      },
    });
  const first = await provision();
  assert.match(first.stdout, /First admin created/);
  assert.ok(!first.stdout.includes('ProvisionPassword'));
  assert.equal((await User.findOne({ email: 'first@test.local' })).role, 'admin');
  await assert.rejects(provision({ ADMIN_EMAIL: 'second@test.local' }));
  const player = await Player.findById(id(118));
  const matchesBefore = await mongoose.model('Match').countDocuments({ players: player._id });
  await assert.rejects(
    provision({ ADMIN_EMAIL: 'incorrect@test.local', LINK_PLAYER_ID: String(player._id) }),
  );
  const linked = await provision({ ADMIN_EMAIL: player.email, LINK_PLAYER_ID: String(player._id) });
  assert.match(linked.stdout, /Member account explicitly linked/);
  const user = await User.findOne({ email: player.email });
  assert.equal(user.role, 'member');
  assert.equal(String(user.playerId), String(player._id));
  assert.equal(
    await mongoose.model('Match').countDocuments({ players: player._id }),
    matchesBefore,
  );
  await assert.rejects(
    provision({ ADMIN_EMAIL: player.email, LINK_PLAYER_ID: String(player._id) }),
  );
});
