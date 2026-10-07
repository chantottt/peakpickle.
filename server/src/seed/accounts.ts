import { User } from '../models/User.js';
import { hashPassword } from '../services/authService.js';
import { Player } from '../models/Player.js';
export async function demoAccounts() {
  const passwordHash = await hashPassword('PeakPickleDemo!2026');
  await User.create({ email: 'admin@demo.local', passwordHash, role: 'admin' });
  const player = await Player.findOne().sort({ _id: 1 });
  if (player)
    await User.create({ email: player.email, passwordHash, role: 'member', playerId: player._id });
  console.log(
    'Temporary demo admin/member accounts created. See LOCAL_AUTH_SETUP.md for disposable demo login details.',
  );
}
