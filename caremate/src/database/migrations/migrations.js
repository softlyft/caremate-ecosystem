// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import journal from './meta/_journal.json';
import m0000 from './0000_outstanding_starjammers.sql';
import m0001 from './0001_mighty_living_mummy.sql';
import m0002 from './0002_mean_phil_sheldon.sql';
import m0003 from './0003_wooden_rogue.sql';
import m0004 from './0004_ordinary_carmella_unuscione.sql';

  export default {
    journal,
    migrations: {
      m0000,
m0001,
m0002,
m0003,
m0004
    }
  }
  