const axios = require('axios');

async function testAPI() {
    try {
        // Listar proyectos
        let response = await axios.get('http://localhost:3000/api/projects');
        console.log('Projects:', response.data);

        // Crear proyecto
        response = await axios.post('http://localhost:3000/api/projects', {
            title: 'Nuevo Proyecto',
            description: 'Descripción del proyecto',
            link: 'http://example.com'
        });
        const newProjectId = response.data.id;
        console.log('New Project Created:', newProjectId);

        // Actualizar proyecto
        await axios.put(`http://localhost:3000/api/projects/${newProjectId}`, {
            title: 'Proyecto Actualizado',
            description: 'Descripción actualizada',
            link: 'http://updated.com'
        });
        console.log('Project Updated');

        // Eliminar proyecto
        await axios.delete(`http://localhost:3000/api/projects/${newProjectId}`);
        console.log('Project Deleted');
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testAPI();
