const express = require('express');
const { Pool } = require('pg');
const { createClient } = require('redis');

const app = express();
const PORT = 3000;

// ============================================
// 1. CONEXIÓN A POSTGRESQL
// ============================================
const pool = new Pool({
    user: 'tarea_user',
    host: 'localhost',
    database: 'tarea_escuela',
    password: 'vacaciones2026',
    port: 5432,
});

// ============================================
// 2. CONEXIÓN A REDIS (REGIS)
// ============================================
const redisClient = createClient({
    url: 'redis://127.0.0.1:6379'
    // si tenés contraseña: password: 'noreikutron'
});

redisClient.on('error', (err) => console.error('Error en Redis:', err));
redisClient.connect().then(() => console.log('✅ Conectado a Redis (Regis)'));

// ============================================
// 3. FUNCIÓN EQUIVALENTE A consulta_con_cache
// ============================================
async function consultaConCache(query, cacheKey, ttl = 60) {
    // ¿Está en Redis?
    const cached = await redisClient.get(cacheKey);
    
    if (cached) {
        console.log('🎯 (Respondido desde Redis - rápido y fácil)');
        return JSON.parse(cached);
    }
    
    // No está en caché, vamos a PostgreSQL
    console.log('🐘 (Consultando PostgreSQL - solo esta vez)');
    const result = await pool.query(query);
    
    // Guardar en Redis por TTL segundos
    await redisClient.setEx(cacheKey, ttl, JSON.stringify(result.rows));
    
    return result.rows;
}

// ============================================
// 4. ENDPOINT PARA PROBAR (igual que tu tarea.py)
// ============================================
app.get('/api/estudiantes', async (req, res) => {
    try {
        // Primero creamos la tabla si no existe
        await pool.query(`
            CREATE TABLE IF NOT EXISTS estudiantes (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(100),
                tarea_completada BOOLEAN
            )
        `);
        
        // Insertamos datos de prueba
        await pool.query(`
            INSERT INTO estudiantes (nombre, tarea_completada) 
            VALUES ('Yo', true), ('Compañero distraído', false)
            ON CONFLICT DO NOTHING
        `);
        
        // Consulta con caché
        const query = "SELECT * FROM estudiantes WHERE tarea_completada = true";
        const cacheKey = "estudiantes_activos";
        
        const resultado = await consultaConCache(query, cacheKey, 60);
        
        res.json({
            mensaje: "✅ Tarea completada. Redis está cacheando las consultas a PostgreSQL.",
            datos: resultado,
            vacaciones: "❄️ ¡A disfrutar las vacaciones de invierno! 🏂"
        });
        
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// 5. ENDPOINT PARA SOUNDWAVE (lo que pide la actividad)
// ============================================
app.get('/api/catalogo', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        
        const cacheKey = `catalogo:page:${page}:limit:${limit}`;
        
        // Cache-Aside (el mismo patrón)
        const cached = await redisClient.get(cacheKey);
        
        if (cached) {
            console.log(`🎯 Sirviendo página ${page} desde Redis`);
            return res.json(JSON.parse(cached));
        }
        
        console.log(`🐘 Sirviendo página ${page} desde PostgreSQL`);
        
        // Acá va tu query real de canciones
        const result = await pool.query(
            'SELECT * FROM canciones LIMIT $1 OFFSET $2',
            [limit, offset]
        );
        
        await redisClient.setEx(cacheKey, 60, JSON.stringify(result.rows));
        
        res.json(result.rows);
        
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error interno' });
    }
});

// ============================================
// 6. INICIAR SERVIDOR
// ============================================
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📡 Probar: curl http://localhost:${PORT}/api/estudiantes`);
});
