const db = require('../db');

async function patchBridge(id, updates) {
    try {
        if (!Array.isArray(updates) || updates.length === 0) {
            throw new Error('Updates must be a non-empty array of objects with param and val.');
        }

        // Build the SQL query dynamically
        const setClauses = updates.map((update, index) => `${update.param} = ?`).join(', ');
        const values = updates.map(update => update.val);

        // Add the `id` to the parameter array
        values.push(id);

        const query = `
            UPDATE conf_bridges
            SET ${setClauses}, updated_at = NOW()
            WHERE id = ?
        `;

        // Execute the query
        const [result] = await db.query(query, values);

        if (result.affectedRows === 0) {
            throw new Error(`No bridge found with ID: ${id}`);
        }

        console.log(`Bridge ID ${id} updated successfully with changes:`, updates);
        return true;
    } catch (err) {
        console.error('Error updating bridge:', err);
        throw err;
    }
}

module.exports = patchBridge;
