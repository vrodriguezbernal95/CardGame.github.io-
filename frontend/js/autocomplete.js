// Componente de Autocompletado Reutilizable
class Autocomplete {
    constructor(inputElement, options = {}) {
        this.input = inputElement;
        this.searchFunction = options.searchFunction; // Función async que devuelve resultados
        this.onSelect = options.onSelect; // Callback cuando se selecciona un item
        this.displayField = options.displayField || 'nombre'; // Campo a mostrar
        this.minChars = options.minChars || 4;
        this.placeholder = options.placeholder || 'Escribe al menos 4 caracteres...';

        this.selectedId = null;
        this.selectedValue = null;
        this.results = [];
        this.currentFocus = -1;

        this.init();
    }

    init() {
        // Configurar input
        this.input.setAttribute('autocomplete', 'off');
        this.input.placeholder = this.placeholder;

        // Crear contenedor de resultados
        this.resultsContainer = document.createElement('div');
        this.resultsContainer.className = 'autocomplete-results';
        this.resultsContainer.style.cssText = `
            position: absolute;
            background: white;
            border: 1px solid #ddd;
            border-top: none;
            max-height: 200px;
            overflow-y: auto;
            z-index: 1000;
            width: ${this.input.offsetWidth}px;
            display: none;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        `;

        // Insertar después del input
        this.input.parentNode.style.position = 'relative';
        this.input.parentNode.insertBefore(this.resultsContainer, this.input.nextSibling);

        // Event listeners
        this.input.addEventListener('input', this.handleInput.bind(this));
        this.input.addEventListener('keydown', this.handleKeydown.bind(this));
        this.input.addEventListener('focus', this.handleFocus.bind(this));

        // Cerrar al hacer click fuera
        document.addEventListener('click', (e) => {
            if (e.target !== this.input && e.target !== this.resultsContainer) {
                this.hideResults();
            }
        });
    }

    async handleInput(e) {
        const value = e.target.value.trim();

        if (value.length < this.minChars) {
            this.hideResults();
            this.selectedId = null;
            this.selectedValue = null;
            return;
        }

        try {
            const response = await this.searchFunction(value);
            this.results = response[Object.keys(response).find(k => Array.isArray(response[k]))] || [];
            this.showResults();
        } catch (error) {
            console.error('Error en búsqueda:', error);
            this.hideResults();
        }
    }

    handleFocus(e) {
        // Si ya hay un valor seleccionado, mostrar ese item
        if (this.selectedId && this.selectedValue) {
            this.results = [{ id: this.selectedId, [this.displayField]: this.selectedValue }];
            this.showResults();
        }
    }

    handleKeydown(e) {
        if (!this.resultsContainer.style.display || this.resultsContainer.style.display === 'none') {
            return;
        }

        const items = this.resultsContainer.getElementsByClassName('autocomplete-item');

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.currentFocus++;
            this.setActive(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.currentFocus--;
            this.setActive(items);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (this.currentFocus > -1 && items[this.currentFocus]) {
                items[this.currentFocus].click();
            }
        } else if (e.key === 'Escape') {
            this.hideResults();
        }
    }

    setActive(items) {
        if (!items) return;

        // Remover active de todos
        Array.from(items).forEach(item => item.classList.remove('autocomplete-active'));

        // Ajustar currentFocus
        if (this.currentFocus >= items.length) this.currentFocus = 0;
        if (this.currentFocus < 0) this.currentFocus = items.length - 1;

        // Agregar active al actual
        items[this.currentFocus].classList.add('autocomplete-active');
        items[this.currentFocus].scrollIntoView({ block: 'nearest' });
    }

    showResults() {
        this.resultsContainer.innerHTML = '';
        this.currentFocus = -1;

        if (this.results.length === 0) {
            const noResults = document.createElement('div');
            noResults.className = 'autocomplete-item';
            noResults.style.cssText = 'padding: 10px; color: #999; cursor: default;';
            noResults.textContent = 'No se encontraron resultados';
            this.resultsContainer.appendChild(noResults);
            this.resultsContainer.style.display = 'block';
            return;
        }

        this.results.forEach(item => {
            const div = document.createElement('div');
            div.className = 'autocomplete-item';
            div.style.cssText = `
                padding: 10px;
                cursor: pointer;
                border-bottom: 1px solid #f0f0f0;
                transition: background-color 0.2s;
            `;

            // Texto a mostrar
            let displayText = item[this.displayField];
            if (item.serie) displayText += ` (${item.serie})`;
            if (item.email && this.displayField === 'nombre') displayText += ` - ${item.email}`;

            div.textContent = displayText;

            // Hover effect
            div.addEventListener('mouseenter', () => {
                div.style.backgroundColor = '#f0f0f0';
            });
            div.addEventListener('mouseleave', () => {
                if (!div.classList.contains('autocomplete-active')) {
                    div.style.backgroundColor = 'white';
                }
            });

            // Click handler
            div.addEventListener('click', () => {
                this.selectItem(item);
            });

            this.resultsContainer.appendChild(div);
        });

        this.resultsContainer.style.display = 'block';
    }

    selectItem(item) {
        this.selectedId = item.id;
        this.selectedValue = item[this.displayField];
        this.input.value = this.selectedValue;
        this.hideResults();

        if (this.onSelect) {
            this.onSelect(item);
        }
    }

    hideResults() {
        this.resultsContainer.style.display = 'none';
        this.currentFocus = -1;
    }

    getValue() {
        return this.selectedId;
    }

    setValue(id, displayValue) {
        this.selectedId = id;
        this.selectedValue = displayValue;
        this.input.value = displayValue;
    }

    clear() {
        this.input.value = '';
        this.selectedId = null;
        this.selectedValue = null;
        this.hideResults();
    }
}

// Estilo para item activo
const style = document.createElement('style');
style.textContent = `
    .autocomplete-active {
        background-color: #e8f4f8 !important;
    }

    .autocomplete-results::-webkit-scrollbar {
        width: 8px;
    }

    .autocomplete-results::-webkit-scrollbar-track {
        background: #f1f1f1;
    }

    .autocomplete-results::-webkit-scrollbar-thumb {
        background: #888;
        border-radius: 4px;
    }

    .autocomplete-results::-webkit-scrollbar-thumb:hover {
        background: #555;
    }
`;
document.head.appendChild(style);
