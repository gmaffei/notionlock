const jwt = require('jsonwebtoken');

module.exports = async function (req, res, next) {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ error: 'Nessun token, autorizzazione negata' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;

        // Check role in database
        const { db } = req;
        const result = await db.query('SELECT role FROM users WHERE id = $1', [decoded.userId]);

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Utente non trovato' });
        }

        if (result.rows[0].role !== 'admin') {
            return res.status(403).json({ error: 'Accesso negato: Richiesti privilegi di amministratore' });
        }

        next();
    } catch (err) {
        res.status(401).json({ error: 'Token non valido' });
    }
};
