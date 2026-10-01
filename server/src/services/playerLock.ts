import type { ClientSession } from 'mongoose';
import { Player } from '../models/Player.js';
import { assert } from '../utils/errors.js';
// Touching referenced players prevents a concurrent deletion/deactivation or
// another court's match start from racing this transaction's validation.
export async function lockActivePlayers(ids: string[], session: ClientSession) {
  for (const id of [...new Set(ids)].sort()) {
    const player = await Player.findOneAndUpdate(
      { _id: id, isActive: true },
      { $inc: { __v: 1 } },
      { new: true, session },
    );
    assert(player, 'Select an active player.');
  }
}
