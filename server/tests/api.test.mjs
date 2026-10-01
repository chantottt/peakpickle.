import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { app } from '../dist/app.js';
import { seedData, seedId } from '../dist/seed/data.js';
import { today } from '../dist/utils/time.js';
let database;
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
});
beforeEach(async () => {
  await seedData();
});
after(async () => {
  await mongoose.disconnect();
  await database?.stop();
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
    scheduledAt: new Date().toISOString(),
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
    scheduledAt: new Date().toISOString(),
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
