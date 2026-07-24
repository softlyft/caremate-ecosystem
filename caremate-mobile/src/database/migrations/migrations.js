// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import journal from './meta/_journal.json';
import m0000 from './0000_outstanding_starjammers.sql';
import m0001 from './0001_mighty_living_mummy.sql';
import m0002 from './0002_mean_phil_sheldon.sql';
import m0003 from './0003_wooden_rogue.sql';
import m0004 from './0004_ordinary_carmella_unuscione.sql';
import m0005 from './0005_broken_iron_lad.sql';
import m0006 from './0006_condemned_white_queen.sql';
import m0007 from './0007_oval_jamie_braddock.sql';
import m0008 from './0008_narrow_blizzard.sql';

export default {
  journal,
  migrations: {
    m0000,
    m0001,
    m0002,
    m0003,
    m0004,
    m0005,
    m0006,
    m0007,
    m0008,
  },
};
