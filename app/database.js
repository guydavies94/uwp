import mysql from 'mysql2/promise'
import settings from '../settings.json' assert { type: 'json' }
const pool = mysql.createPool(settings.database)


/**
 * Wraps the mysql2 library to pass prepared statements (automatically
 * sanitised by the library) to a connection pool and return a Promise
 * for the results.
 * @returns {Promise<Array>} A promise returning the results of the query
 */
export default (...args) =>
    pool.query(...args)
        .then(results => results[0])