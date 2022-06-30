import express from 'express'
import settings from './settings.js'
import database from './database.js'


const app = express()
app.use(express.static('app/public'))
app.use(express.json())


app.get('/people', async (req, res) => {
    try {
        const results = await database(`
            SELECT id, name, email, age
            FROM people
        `)
        res.json(results)
    } catch (err) {
        console.error(err)
        res.status(500).end()
    }
})


app.get('/pets', async (req, res) => {
    try {
        const results = await database(`
            SELECT id, name, species, age, person_id
            FROM pets
        `)
        res.json(results)
    } catch (err) {
        console.error(err)
        res.status(500).end()
    }
})


app.get('/people/:id', async (req, res) => {
    const { id } = req.params

    if (notIntegerish(id)) return res.status(400).json({
        message: "Parameter 'id' must be an integer."
    })

    try {
        const result = await getPersonById(id)

        if (!result) return res.status(404).json({
            message: `No person was found with the id ${id}.`
        })

        res.json(result)
    } catch (err) {
        console.error(err)
        res.status(500).end()
    }
})


app.get('/pets/:id', async (req, res) => {
    const { id } = req.params
    if (notIntegerish(id)) return res.status(400).json({
        message: "Parameter 'id' must be an integer."
    })

    try {
        const result = await getPetById(id)

        if (!result) return res.status(404).json({
            message: `No pet was found with the id ${id}.`
        })

        res.json(result)
    } catch (err) {
        console.error(err)
        res.status(500).end()
    }
})


app.get('/people/:id/pets', async (req, res) => {
    const { id } = req.params

    if (notIntegerish(id)) return res.status(400).json({
        message: "Parameter 'id' must be an integer."
    })

    try {
        const results = await database(`
            SELECT pets.id, pets.name, species, pets.age
            FROM people
            LEFT JOIN pets
            ON pets.person_id = people.id
            WHERE people.id = ?
        `, [+id])

        // If the person doesn't exist, results.length will be zero.
        // If the person exists but has no pets, results will contain a single row where every field is null. --GAD
        if (!results.length) return res.status(404).json({
            message: `No person was found with the id ${id}.`
        })

        res.json(results.filter(r => r.id !== null))
    } catch (err) {
        console.error(err)
        res.status(500).end()
    }
})


app.post('/people', async (req, res) => {
    const {
        name,
        email,
        age
    } = req.body

    if (anyNullish(name, email, age)) return res.status(400).json({
        message: 'Required parameters were missing from the request.\n\nExpected: {\n\tname: string,\n\temail: string,\n\tage: number\n}\n'
    })

    if (notIntegerish(age)) return res.status(400).json({
        message: 'Parameter \'age\' must be an integer.'
    })

    if (!/^.+@.+\..+$/.test(email)) return res.status(400).json({
        message: "Parameter 'email' was invalid."
    })

    try {
        const { insertId } = await database(`
            INSERT INTO people
                (name, email, age)
            VALUES
                (?, ?, ?)
        `, [name, email, +age])

        const newPerson = await getPersonById(insertId)

        res.status(201).json(newPerson)
    } catch (err) {
        console.error(err)
        res.status(500).end()
    }
})


app.post('/pets', async (req, res) => {
    const {
        person_id: personId,
        name,
        species,
        age
    } = req.body

    if (anyNullish(personId, name, species, age)) return res.status(400).json({
        message: 'Required parameters were missing from the request.\n\nExpected: {\n\tperson_id: number,\n\tname: string,\n\tspecies: string\n\tage: number\n}\n'
    })

    if (notIntegerish(personId, age)) return res.status(400).json({
        message: "Parameters 'person_id' and 'age' must be integers."
    })

    try {
        const { insertId } = await database(`
            INSERT INTO pets
                (person_id, name, species, age)
            VALUES
                (?, ?, ?, ?)
        `, [personId, name, species, +age])

        const newPet = await getPetById(insertId)

        res.status(201).json(newPet)
    } catch (err) {
        if ('code' in err && err.code === 'ER_NO_REFERENCED_ROW_2')
            return res.status(404).json({
                // Error was thrown because the person ID doesn't exist. --GAD
                message: `No person was found with the id ${personId}.`
            })

        console.error(err)
        res.status(500).end()
    }
})


app.put('/people/:id', async (req, res) => {
    const { id } = req.params

    if (notIntegerish(id, req.body.age ?? 1)) return res.status(400).json({
        message: "Parameters 'id' and 'age' must be integers."
    })

    const existingPerson = await getPersonById(id)

    if (!existingPerson) return res.status(404).json({
        message: `No person was found with the id ${id}.`
    })

    const { name, email, age } = { ...existingPerson, ...req.body }

    if (!/^.+@.+\..+$/.test(email)) return res.status(400).json({
        message: "Parameter 'email' was invalid."
    })

    try {
        const { affectedRows } = await database(`
            UPDATE people
            SET
                name = ?,
                email = ?,
                age = ?
            WHERE id = ?
        `, [name, email, age, +id])

        if (!affectedRows)
            throw new Error('The person exists, but no records were updated.')

        res.json(await getPersonById(id))
    } catch (err) {
        console.error(err)
        res.status(500).end()
    }
})


app.put('/pets/:id', async (req, res) => {
    const { id } = req.params

    if (notIntegerish(id, req.body.age ?? 1)) return res.status(400).json({
        message: "Parameters 'id' and 'age' must be integers."
    })

    if ('person_id' in req.body) return res.status(403).json({
        message: 'The person ID cannot be changed.'
    })

    const existingPet = await getPetById(id)

    if (!existingPet) return res.status(404).json({
        message: `No pet was found with the id ${id}.`
    })

    const { name, species, age } = { ...existingPet, ...req.body }

    try {
        const { affectedRows } = await database(`
            UPDATE pets
            SET
                name = ?,
                species = ?,
                age = ?
            WHERE id = ?
        `, [name, species, age, +id])

        if (!affectedRows)
            throw new Error('The pet exists, but no records were updated.')

        res.json(await getPetById(id))
    } catch (err) {
        console.error(err)
        res.status(500).end()
    }
})


app.delete('/people/:id', async (req, res) => {
    const { id } = req.params

    const existingPerson = await getPersonById(id)

    if (!existingPerson) return res.status(404).json({
        message: `No person was found with the id ${id}.`
    })

    try {
        // ON DELETE CASCADE is set in the person_id FK, so no need to manually delete the pet records. --GAD
        await database(`
            DELETE FROM people
            WHERE id = ?
        `, [+id])

        res.json(existingPerson)
    } catch (err) {
        console.error(err)
        res.status(500).end()
    }
})


app.delete('/pets/:id', async (req, res) => {
    const { id } = req.params

    const existingPet = await getPetById(id)

    if (!existingPet) return res.status(404).json({
        message: `No person was found with the id ${id}.`
    })

    try {
        await database(`
            DELETE FROM pets
            WHERE id = ?
        `, [+id])

        res.json(existingPet)
    } catch (err) {
        console.error(err)
        res.status(500).end()
    }
})


app.listen(settings.port, () => {
    console.log(`${new Date().toISOString()}: Launched (port ${settings.port})`)
})


/**
 * @typedef {Object} Person
 * @property {number} id
 * @property {string} name
 * @property {string} email
 * @property {number} age
 */


/**
 * @typedef {Object} Pet
 * @property {number} id
 * @property {string} name
 * @property {string} species
 * @property {number} age
 * @property {number} person_id
 */


/**
 * Keeps things a bit tidier than massive && chains everywhere.
 * Returns true if any params are null or undefined.
 * @returns {boolean}
 */
const anyNullish = (...values) =>
    values.reduce((acc, current) =>
        acc || (current == null),
        false
    )


/**
 * Returns true if any params cannot be parsed as integers.
 * @returns {boolean}
 */
const notIntegerish = (...values) =>
    values.reduce((acc, current) =>
        acc || !Number.isInteger(+current),
        false
    )


/**
 * Retrieves a person by ID
 * @param {number} id Person ID to retrieve
 * @returns {?Person} The retrieved person, or null if the person does not exist
 */
const getPersonById = async (id) =>
    (await database(`
        SELECT id, name, email, age
        FROM people
        WHERE id = ?
    `, [+id]))[0] ?? null


/**
 * Retrieves a pet by ID
 * @param {number} id Pet ID to retrieve
 * @returns {?Pet} The retrieved pet, or null if the pet does not exist
 */
const getPetById = async (id) =>
    (await database(`
     SELECT id, name, species, age, person_id
     FROM pets
     WHERE id = ?
 `, [+id]))[0] ?? null