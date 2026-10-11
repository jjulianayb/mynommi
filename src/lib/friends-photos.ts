import bia from '@/assets/people/bia.jpg';
import marina from '@/assets/people/marina.jpg';
import rafa from '@/assets/people/rafa.jpg';
import tati from '@/assets/people/tati.jpg';
import lucas from '@/assets/people/lucas.jpg';
import helena from '@/assets/people/helena.jpg';
import carla from '@/assets/people/carla.jpg';
import leo from '@/assets/people/leo.jpg';
import joana from '@/assets/people/joana.jpg';
import pedro from '@/assets/people/pedro.jpg';
import dani from '@/assets/people/dani.jpg';

import karaoke from '@/assets/moments/karaoke.jpg';
import vinho from '@/assets/moments/vinho.jpg';
import trilha from '@/assets/moments/trilha.jpg';
import pizza from '@/assets/moments/pizza.jpg';
import bolo from '@/assets/moments/bolo.jpg';
import corrida from '@/assets/moments/corrida.jpg';

/** Demo profile photos keyed by person id (id 3 = the signed-in demo user, Dani). */
export const personPhoto: Record<number, string> = {
  1: carla,
  2: leo,
  3: dani,
  4: marina,
  6: tati,
  7: bia,
  8: joana,
  10: pedro,
  11: rafa,
  12: lucas,
  13: helena,
};

export const momentPhoto = { karaoke, vinho, trilha, pizza, bolo, corrida };
