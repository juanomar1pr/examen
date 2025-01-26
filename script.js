// script.js
import { categories } from './question.js'; // Cambia 'path/to' por la ruta real

// Cargar dinámicamente las categorías en el dropdown
function loadCategories() {
  const categorySelect = document.getElementById('category');
  for (const category in categories) {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category.charAt(0).toUpperCase() + category.slice(1); // Capitalizar
    categorySelect.appendChild(option);
  }
}

// Iniciar el quiz (capturar la selección)
function startQuiz() {
  const selectedCategory = document.getElementById('category').value;
  if (!selectedCategory) {
    alert('Por favor, selecciona una categoría.');
    return;
  }

  // Aquí puedes manejar las preguntas de la categoría seleccionada
  alert(`Has seleccionado la categoría: ${selectedCategory}`);
  console.log(categories[selectedCategory]); // Preguntas de la categoría seleccionada
}

// Llama a la función para cargar las categorías cuando se cargue la página
document.addEventListener('DOMContentLoaded', loadCategories);
