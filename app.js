const express = require("express");
const bodyParser = require("body-parser");
const questions = require("./questions.json");
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 8000;
const { v4: uuidv4 } = require('uuid'); // Necesita instalar: npm install uuid
const session = require("express-session");
app.set("view engine", "ejs");
const questionsFilePath = path.join(__dirname, "./questions.js")
let categories = require("./questions.json");
const jsonPath = path.join(__dirname, './datos.json');
app.set("views", path.join(__dirname, 'vistas'));
// Middleware para manejar JSON
app.use(express.static('public'));
app.use(express.json());
const cors = require('cors');
app.use(cors());
app.use(
    session({
        secret: "mi-secreto-super-seguro",
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 1000 * 60 * 60 * 24, // 24 horas
            httpOnly: true, // Seguridad contra ataques XSS
        },
    })
);
// Ruta principal
app.get('/add', isAuthenticated,(req, res) => {
 const categories = Object.keys(questions); // Extraer las categorías (matematicas, ciencia, historia)
  
 res.render('add',{categories} )
});
// Endpoint para actualizar preguntas
app.post('/api/editar-pregunta', (req, res) => {
    const { id, nuevaCategoria, nuevaPregunta } = req.body;

    // Aquí iría la lógica para actualizar la pregunta en tu base de datos
    console.log(`Actualizando pregunta ${id}:`);
    console.log(`Nueva categoría: ${nuevaCategoria}, Nueva pregunta: ${nuevaPregunta}`);

    // Respuesta al cliente
    res.json({ mensaje: 'Pregunta actualizada correctamente' });
});


// Cargar las categorías


app.post('/api/agregar-pregunta', (req, res) => {
  const { category, questionData } = req.body;

  if (!category || !questionData) {
    return res.status(400).json({ message: 'Datos incompletos.' });
  }

  fs.readFile('questions.json', 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ message: 'Error al leer el archivo.' });
    }

    let preguntas = {};
    if (data) {
      preguntas = JSON.parse(data);
    }

    if (!preguntas[category]) {
      preguntas[category] = [];
    }

    preguntas[category].push(questionData);

    fs.writeFile('questions.json', JSON.stringify(preguntas, null, 2), (err) => {
      if (err) {
        return res.status(500).json({ message: 'Error al guardar la pregunta.' });
      }
      res.status(200).json({ message: 'Pregunta añadida correctamente.' });
    });
  });
});
function saveQuestionsToFile() {
  const filePath = path.join(__dirname, 'questions.json');
  const fileContent = `module.exports = ${JSON.stringify(questions, null, 2)};`;

  fs.writeFileSync(filePath, fileContent, 'utf8', (err) => {
    if (err) {
      console.error('Error al guardar las preguntas:', err);
    } else {
      console.log('Preguntas guardadas correctamente.');
    }
  });
}
// Ruta para leer puntuaciones de los estudiantes
function leerPuntuaciones() {
    try {
        const data = fs.readFileSync(path.join(__dirname, "scores.json"), "utf8");
        return JSON.parse(data).scores;
    } catch (err) {
        console.error("Error al leer el archivo de puntuaciones", err);
        return [];
    }
}
function leerPreguntas() {
    try {
        const data = fs.readFileSync(path.join(__dirname, "questions.json"), "utf8");
        return JSON.parse(data).scores;
    } catch (err) {
        console.error("Error al leer el archivo de puntuaciones", err);
        return {};
    }
}
// Ruta para guardar puntuaciones
function guardarPuntuacion(username, puntuacion, respuestasConSeleccion) {
    const scores = leerPuntuaciones();

    const respuestasDetalladas = respuestasConSeleccion.map(respuesta => ({
        id: respuesta.id,
        tiempo: respuesta.fechaHora,
        text: respuesta.text,
        correctAnswer: respuesta.answer,
        selectedAnswer: respuesta.selectedAnswer,
        isCorrect: respuesta.answer === respuesta.selectedAnswer,
    }));

    scores.push({ username, puntuacion, respuestas: respuestasDetalladas });

    fs.writeFileSync(
        path.join(__dirname, "scores.json"),
        JSON.stringify({ scores }, null, 2)
    );
}

function leerPreguntas() {
    try {
        const data = fs.readFileSync(path.join(__dirname, "questions.json"), "utf8");
        return JSON.parse(data); // Asegúrate de que el JSON tiene la estructura correcta
    } catch (err) {
        console.error("Error al leer el archivo de preguntas:", err);
        return {}; // Devuelve un objeto vacío en caso de error
    }
}

function LeerelarchivoJSON() {
    try {
        const datos = fs.readFileSync(jsonPath, 'utf8');
        const parsedData = JSON.parse(datos);
        return parsedData.usuarios; // Devuelve la lista de usuarios
    } catch (err) {
        console.error("Error al leer el archivo JSON:", err);
        return []; // Devuelve un array vacío si ocurre un error
    }
}
function isAuthenticated(req, res, next) {
    if (req.session && req.session.user) {
        return next(); // Usuario autenticado, continuar
    }
    res.redirect("/login"); // Redirigir al login si no está autenticado
}
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static("public"));
app.use((req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        return next(); // Permitir que el administrador siga conectado
    }
    // Aquí implementa tu lógica para desconectar a otros usuarios
    next();
});
let currentQuestionIndex = 0;
let score = 0;
// Ruta para servir las categorías
app.get('/categories', (req, res) => {
  const categories = Object.keys(questions); // Extraer las categorías (matematicas, ciencia, historia)
  res.json(categories); // Devolver las categorías como un JSON
});
app.get('/editable',isAuthenticated, (req, res) => {
  res.render('editable', { questions }); // Pasa las preguntas al EJS
});
app.put('/edit-question/:category/:id', (req, res) => {
  const { category, id } = req.params;
  const updatedQuestion = req.body;

  // Leer el archivo JSON
  const filePath = path.join(__dirname, 'questions.json');
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error al leer el archivo JSON:', err);
      return res.status(500).json({ success: false, message: 'Error al leer el archivo' });
    }

    const questions = JSON.parse(data);
    // Actualizar la pregunta correspondiente
    const questionIndex = questions[category].findIndex(q => q.id === parseInt(id));
    if (questionIndex !== -1) {
      questions[category][questionIndex] = updatedQuestion;

      // Escribir los cambios en el archivo JSON
      fs.writeFile(filePath, JSON.stringify(questions, null, 2), 'utf8', (err) => {
        if (err) {
          console.error('Error al escribir en el archivo JSON:', err);
          return res.status(500).json({ success: false, message: 'Error al guardar los cambios' });
        }
        res.json({ success: true });
      });
    } else {
      res.status(404).json({ success: false, message: 'Pregunta no encontrada' });
    }
  });
});


// Ruta para eliminar una pregunta
app.delete('/delete-question/:category/:id', (req, res) => {
  const { category, id } = req.params;

 
  const filePath = path.join(__dirname, 'questions.json');
  if (questions[category]) {
    const questionIndex = questions[category].findIndex(q => q.id === parseInt(id));
    if (questionIndex !== -1) {
      questions[category].splice(questionIndex, 1);
      fs.writeFileSync(filePath, JSON.stringify(questions, null, 2));
      return res.json({ success: true });
    }
  }
  res.status(404).json({ success: false, message: 'Pregunta no encontrada' });
});

app.post('/update-question/:category/:id', (req, res) => {
  const { category, id } = req.params;
  const { text, answer, options } = req.body;

  // Leer el archivo actual
  fs.readFile(questionsFilePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error al leer el archivo:', err);
      return res.status(500).json({ success: false, message: 'Error al leer el archivo de preguntas.' });
    }

    let questionsData;
    try {
      questionsData = JSON.parse(data);
    } catch (parseError) {
      console.error('Error al parsear el archivo:', parseError);
      return res.status(500).json({ success: false, message: 'Error al parsear el archivo de preguntas.' });
    }

    if (!questionsData[category]) {
      return res.status(404).json({ success: false, message: 'Categoría no encontrada.' });
    }

    // Encontrar y actualizar la pregunta
    const questionIndex = questionsData[category].findIndex(q => q.id === parseInt(id, 10));
    if (questionIndex === -1) {
      return res.status(404).json({ success: false, message: 'Pregunta no encontrada.' });
    }

    questionsData[category][questionIndex] = { id: parseInt(id, 10), text, answer, options };

    fs.writeFile(questionsFilePath, JSON.stringify(questionsData, null, 2), 'utf8', writeErr => {
      if (writeErr) {
        console.error('Error al escribir en el archivo:', writeErr);
        return res.status(500).json({ success: false, message: 'Error al escribir en el archivo de preguntas.' });
      }

      res.json({ success: true, message: 'Pregunta actualizada correctamente.' });
    });
  });
});

// Ruta para agregar una nueva categoría
app.post("/api/categories", (req, res) => {
    const { category } = req.body;
    if (questions[category]) {
        return res.status(400).json({ message: "La categoría ya existe." });
    }
    questions[category] = [];
    saveQuestionsToFile();
    res.json({ message: "Categoría agregada exitosamente." });
});
// Ruta para agregar una pregunta a una categoría
app.post("/api/questions", (req, res) => {
    const { category, question, answer } = req.body;
    if (!questions[category]) {
        return res.status(404).json({ message: "Categoría no encontrada." });
    }
    questions[category].push({ question, answer });
    saveQuestionsToFile();
    res.json({ message: "Pregunta agregada exitosamente." });
});

// Ruta para editar una pregunta
app.put("/api/questions", (req, res) => {
    const { category, index, question, answer } = req.body;
    if (!questions[category] || !questions[category][index]) {
        return res.status(404).json({ message: "Pregunta no encontrada." });
    }
    questions[category][index] = { question, answer };
    saveQuestionsToFile();
    res.json({ message: "Pregunta editada exitosamente." });
});

// Función para guardar el archivo question.js
function saveQuestionsToFile() {
    const content = `const questions = ${JSON.stringify(questions, null, 4)};\n\nmodule.exports = questions;`;
    fs.writeFileSync(questionsFilePath, content, "utf-8");
}
app.get('/datos', (req, res) => {
    const datos = LeerelarchivoJSON();
    res.json(datos);
});
app.get('/', (req, res) => {
    const datos = LeerelarchivoJSON();
    res.render('login');
});
app.get('/editarusr',isAuthenticated, (req,res) =>{
    const usuarios= LeerelarchivoJSON ()
   
  
    res.render('editarusr',{usuarios});
})
app.get('/editar/:usuario', (req, res) => {
    const datos = JSON.parse(fs.readFileSync('datos.json', 'utf-8'));
    const usuario = datos.usuarios.find(u => u.usuario === req.params.usuario);
    if (!usuario) {
        return res.status(404).send('Usuario no encontrado');
    }
    res.render('editar', { usuario });
});
// Ruta para guardar cambios
app.post('/editar/:usuario', (req, res) => {
    const datos = JSON.parse(fs.readFileSync('datos.json', 'utf-8'));
    const index = datos.usuarios.findIndex(u => u.usuario === req.params.usuario);

    if (index === -1) {
        return res.status(404).send('Usuario no encontrado');
    }

    // Actualiza los datos
    datos.usuarios[index] = {
        usuario: req.params.usuario, // No permitimos cambiar el nombre de usuario
        contraseña: req.body.contraseña,
        rol: req.body.rol,
        nombre: req.body.nombre,
    };

    // Guarda los datos actualizados
    fs.writeFileSync('datos.json', JSON.stringify(datos, null, 2));
    res.redirect('/editarusr');
});
// Ruta para mostrar el formulario de agregar usuario
app.get('/agregar', (req, res) => {
    res.render('agregar');
});

// Ruta para procesar el formulario y agregar un nuevo usuario
app.post('/agregar', (req, res) => {
    const datos = JSON.parse(fs.readFileSync('datos.json', 'utf-8'));
    
    // Verifica que el usuario no exista ya
    const existe = datos.usuarios.find(u => u.usuario === req.body.usuario);
    if (existe) {
        return res.status(400).send('El usuario ya existe. Intenta con otro nombre de usuario.');
    }

    // Agregar el nuevo usuario al arreglo
    datos.usuarios.push({
        usuario: req.body.usuario,
        contraseña: req.body.contraseña,
        rol: req.body.rol,
        nombre: req.body.nombre,
    });

    // Guardar los datos actualizados en el archivo JSON
    fs.writeFileSync('datos.json', JSON.stringify(datos, null, 2));
    res.redirect('/agregar');
});
// Ruta para eliminar un usuario
app.post('/eliminar/:usuario', (req, res) => {
    const datos = JSON.parse(fs.readFileSync('datos.json', 'utf-8'));

    // Filtra el usuario que debe ser eliminado
    const nuevosUsuarios = datos.usuarios.filter(u => u.usuario !== req.params.usuario);

    // Si no se encuentra el usuario, redirigir con un error
    if (nuevosUsuarios.length === datos.usuarios.length) {
        return res.status(404).send('Usuario no encontrado');
    }

    // Guarda los datos actualizados
    datos.usuarios = nuevosUsuarios;
    fs.writeFileSync('datos.json', JSON.stringify(datos, null, 2));

    // Redirige a la página principal
    res.redirect('/editarusr');
});
// Configurar EJS y middlewares
app.get("/login", (req, res) => {
    res.render("./login", { error: null }); // Enviar null por defecto
});
app.post("/login", (req, res) => {
    const { username, password } = req.body;
    const usuarios = LeerelarchivoJSON();

    // Buscar al usuario en la lista
    const usuario = usuarios.find(user => user.usuario === username && user.contraseña === password);
  if (usuario) {
        req.session.user = { username: usuario.usuario, nombre: usuario.nombre, rol: usuario.rol };
        if (usuario.rol === "admin") {
            res.redirect("/maestras");
        } else {
            res.redirect("/estudiantes");
        }
    } else {
        res.render("login", { error: "Credenciales incorrectas" });
    }
 
});
// Ruta para estudiantes
app.get("/estudiantes",isAuthenticated,  (req, res) => {
   const preguntas = leerPreguntas()
    
    if (req.session.user && req.session.user.rol === "usr") {
        
        res.render("home", { username: req.session.user.nombre, preguntas ,pageinfo:"Un Texto"});
    } else {
        res.redirect("/home");
    }
});
app.get("/home", (req, res) => {
    
    if (req.session.user && req.session.user.rol === "usr") {
        
        res.render("home", { username: req.session.user.nombre, preguntas ,pageinfo:"Un Texto"});
    } else {
        res.redirect("/home");
    }
    
});
// Ruta para manejar la selección de categoría y redirigir al quiz
app.get('/start-quiz', (req, res) => {
  const category = req.query.category;
  if (!preguntas[category]) {
    return res.status(404).send('Categoría no encontrada');
  }
});

app.get("/quiz", isAuthenticated, (req, res) => {
    const fechaActual = new Date();
    const category = req.query.category;

    if (!category || !questions[category]) {
        return res.status(404).render("error", { message: "Categoría no encontrada" });
    }

    const categoryQuestions = questions[category];
    res.render("studentQuiz", {
        username: req.session.user.nombre,
        category,
        questions: categoryQuestions,
        fechaActual : fechaActual,
    });
});
function obtenerPreguntasPorCategoria(categoriaSeleccionada, totalPreguntas = 5) {
    const preguntas = leerPreguntas(); // Asume que esta función lee el archivo questions.json
    const preguntasPorCategoria = preguntas[categoriaSeleccionada] || [];
    const otrasCategorias = Object.keys(preguntas).filter(cat => cat !== categoriaSeleccionada);

    // Preguntas de la categoría seleccionada
    const seleccionadas = [...preguntasPorCategoria];

    // Agregar preguntas de otras categorías
    otrasCategorias.forEach(categoria => {
        const preguntasDeCategoria = preguntas[categoria];
        seleccionadas.push(...preguntasDeCategoria);
    });

    // Barajar preguntas y limitar al total deseado
    return seleccionadas.sort(() => 0.5 - Math.random()).slice(0, totalPreguntas);
}
app.post("/submit-quiz", isAuthenticated, (req, res) => {
    const respuestas = req.body; // Captura las respuestas enviadas por el cliente
    const preguntas = JSON.parse(respuestas.preguntas); // Obtiene las preguntas desde el formulario
 const fecha = new Date();
 // Obtener el día del mes (1-31)
const dia = fecha.getDate();

// Obtener el mes (0-11), por lo que sumamos 1 para obtener el rango 1-12
const mes = fecha.getMonth() + 1;

// Obtener el año completo (4 dígitos)
const anio = fecha.getFullYear();

// Obtener la hora (0-23)
const hora = fecha.getHours();

// Obtener los minutos (0-59)
const minutos = fecha.getMinutes();

// Obtener los segundos (0-59)
const segundos = fecha.getSeconds();
const fechaHora = `${anio}-${mes.toString().padStart(2, '0')}-${dia.toString().padStart(2, '0')} ${hora.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
  req.session.fechaHora = fechaHora;
    let puntuacion = 0;
    let respuestasConSeleccion = [];
    let respuestasCorrectas = [];

    preguntas.forEach((pregunta, index) => {
        const selectedAnswer = respuestas[`question${index}`];

        if (selectedAnswer === pregunta.answer) {
            puntuacion++;
            respuestasCorrectas.push(pregunta); // Agrega la pregunta correcta
        }
        
        // Registrar la pregunta con la respuesta seleccionada
        respuestasConSeleccion.push({
            id: pregunta.id,
        fechaHora: fechaHora,
            text: pregunta.text,
            answer: pregunta.answer,
            selectedAnswer: selectedAnswer,
        });
    });

    // Guardar la puntuación y las respuestas
    guardarPuntuacion(req.session.user.username, puntuacion, respuestasConSeleccion);
// Leer el archivo scores.json
    
 
    // Renderizar la vista con los resultados
    res.render("quiz", {
        username: req.session.user.nombre,
        puntuacion,

        category: req.body.category,
        pageinfo: "Resultados del Quiz",
    });
});

// Ruta para obtener las preguntas
app.get('/questions', (req, res) => {
  res.json(questions);
});
// Endpoint para actualizar una pregunta
app.post('/update-question/:category/:questionId', (req, res) => {
  const { category, questionId } = req.params;
  const { text, answer, options } = req.body;

  // Buscar la categoría
  if (categories[category]) {
    // Buscar la pregunta por ID
    const question = categories[category].find(q => q.id == questionId);
    if (question) {
      // Actualizar la pregunta
      question.text = text;
      question.answer = answer;
      question.options = options;

      // Guardar los cambios en el archivo
      fs.writeFileSync(path.join(__dirname, 'questions.json'), JSON.stringify(categories, null, 2));

      res.json({ success: true });
    } else {
      res.json({ success: false, message: 'Pregunta no encontrada' });
    }
  } else {
    res.json({ success: false, message: 'Categoría no encontrada' });
  }
});
app.get("/maestras", isAuthenticated, (req, res) => {
    if (req.session.user.rol === "admin") {
         const estudiantes = leerPuntuaciones();
        res.render("teacherScores", { estudiantes });
    } else {
        res.redirect("/login");
    }
});
app.post('/logout', (req, res) => {
    if (req.session.user.role === 'admin') {
        return res.json({ message: "El administrador no puede cerrar sesión automáticamente." });
    }
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Error al cerrar sesión');
        }
        res.redirect('/login');
    });
});
const filePath = path.join(__dirname, 'scores.json');
app.post('/borrar-todos-los-scores', (req, res) => {
    const dataVacia = { scores: [] }; // Estructura vacía deseada
const resultado = LeerelarchivoJSON()
    // Escribir la estructura vacía en el archivo
    fs.writeFile(filePath, JSON.stringify(dataVacia, null, 2), (err) => {
        if (err) {
            console.error('Error al escribir el archivo:', err);
            return res.status(500).send('Error al procesar la solicitud.');
        }
        res.redirect('/maestras'); // Redirigir a la página principal
    });
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});
