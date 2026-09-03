const pool = require('../config/db');
const { syncOfficialNews } = require('../services/officialNewsService');

syncOfficialNews()
  .then((results) => console.log(JSON.stringify(results, null, 2)))
  .then(() => pool.end())
  .catch(async (error) => {
    console.error('Đồng bộ nguồn chính thức thất bại:', error.message);
    await pool.end();
    process.exitCode = 1;
  });
